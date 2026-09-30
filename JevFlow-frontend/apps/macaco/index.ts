import express, { Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import * as path from "path";
import * as bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
// @ts-ignore - no bundled types needed at runtime (transpile-only)
import RedisStoreFactory from "connect-redis";
// @ts-ignore - no bundled types needed at runtime (transpile-only)
import { createClient } from "redis";
import { errorMiddleware } from "./errorHandling";
import { initPassport, registerAuthRoutes } from "./passport";
import { instance } from "./connect";

dotenv.config({ path: path.resolve(__dirname, "./.env") });

const app: express.Express = express();

app.get("/api/health-check", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use(cookieParser("jevflow-secret"));

const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days
const SESSION_COOKIE_NAME = "jevflow.sid";

async function buildSessionStore(): Promise<any | undefined> {
  // Redis-backed sessions so logins survive proxy restarts (the default
  // MemoryStore loses everything on restart, which showed up as
  // mysteriously empty lists). Only used when REDIS_URL is configured;
  // otherwise we keep the in-memory store for plain local dev.
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return undefined;
  try {
    const client = createClient({ url: redisUrl });
    client.on("error", (err: any) =>
      console.warn("[macaco] redis session store:", err?.message || err)
    );
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("redis connect timeout")), 4000)
      ),
    ]);
    const RedisStoreClass =
      (RedisStoreFactory as any).default ?? (RedisStoreFactory as any);
    console.log("[macaco] redis session store connected");
    return new RedisStoreClass({ client });
  } catch (err: any) {
    console.warn(
      "[macaco] redis unavailable, falling back to memory sessions:",
      err?.message || err
    );
    return undefined;
  }
}

async function boot() {
  const store = await buildSessionStore();
  app.use(
    session({
      ...(store ? { store } : {}),
      name: SESSION_COOKIE_NAME,
      secret: process.env.SESSION_SECRET || "jevflow-session-secret",
      resave: false,
      saveUninitialized: true,
      rolling: true,
      cookie: {
        maxAge: SESSION_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      },
    })
  );

  app.set("port", process.env.PORT || 4000);
  app.set("client_app_path", path.resolve(__dirname, process.env.CLIENT_APP_PATH || ""));
  app.set("login_auth", "/auth/login/");
  app.set("client_index_path", path.resolve(__dirname, process.env.CLIENT_INDEX_PATH || ""));
  app.set("api_url", process.env.API_URL || "");
  instance.defaults.baseURL = app.get("api_url");
  instance.defaults.timeout = 30000;

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.get("/static/*", express.static(app.get("client_app_path")));

  const passport = await initPassport(app);

  app.post(app.get("login_auth"), passport.authenticate("local"), (req, res) => {
    const payload = (req as any).authPayload || null;
    if (payload && (req as any).session) (req as any).session.user = payload;
    res.json(payload);
  });

  // Session check for the SPA: validates the cookie on page load so the UI
  // never shows "logged in" with a dead session (empty lists everywhere).
  // Registered BEFORE the /auth/* proxy below.
  app.get("/auth/me", (req, res) => {
    const user = (req as any).session?.user;
    if (!user?.token) return res.status(401).json({ detail: "Not authenticated." });
    return res.json(user);
  });

  app.post("/auth/logout", (req, res) => {
    (req as any).session?.destroy?.(() => undefined);
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });

  registerAuthRoutes(app);

  const apiProxy = (req: any, res: Response, _next: NextFunction) => {
    // VHRS shape: the SPA calls /api/<route>/; strip /api because Django
    // serves resources at root. /auth/* passes through untouched.
    let endpoint: string = req.originalUrl || "/";
    if (endpoint.startsWith("/api")) endpoint = endpoint.replace(/^\/api/, "");
    if (!endpoint) endpoint = "/";
    const token = (req as any).session?.user?.token;
    const headers = token ? { Authorization: `Token ${token}` } : {};
    const method = req.method as "GET" | "POST" | "PUT" | "DELETE";
    instance({ method, url: endpoint, data: req.body, headers })
      .then((result) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.json(result.data);
      })
      .catch((error: any) => {
        if (error.response) return res.status(error.response.status).json(error.response.data);
        return res.status(500).json({ error: "Proxy error", details: error.message });
      });
  };

  app.use("/api/*", apiProxy);
  app.use("/auth/*", apiProxy);

  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(app.get("client_index_path"));
  });

  app.use(errorMiddleware);

  app.listen(app.get("port"), function () {
    console.log(`JevFlow proxy started at port ${app.get("port")}`);
  });
}

void boot();
