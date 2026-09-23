import passport from "passport";
import passportLocal from "passport-local";
// @ts-ignore - no types for google strategy
import passportGoogle from "passport-google-oauth20";
// @ts-ignore - no types for slack strategy
import passportSlack from "passport-slack-oauth2";
// @ts-ignore - no types for github strategy
import passportGithub from "passport-github2";
// @ts-ignore - no types for generic oauth2 strategy
import passportOauth2 from "passport-oauth2";
import axios from "axios";
import { dataLayerObj, RequestType } from "./connect";

// Azure AD is optional; load lazily so missing package won't crash.
let AzureStrategy: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AzureStrategy = require("passport-azure-ad").OIDCStrategy;
} catch {
  AzureStrategy = null;
}

interface ProviderKeys {
  clientID: string;
  clientSecret: string;
  configured: boolean;
}

const ENV_FALLBACK: Record<string, { id: string; secret: string }> = {
  google: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  github: { id: "GITHUB_CLIENT_ID", secret: "GITHUB_CLIENT_SECRET" },
  x: { id: "X_CLIENT_ID", secret: "X_CLIENT_SECRET" },
  slack: { id: "SLACK_CLIENT_ID", secret: "SLACK_CLIENT_SECRET" },
};

async function loadProviderKeys(): Promise<Record<string, ProviderKeys>> {
  // Keys live in Django (OAuthProvider rows, managed on the Settings page).
  // Env vars are only a fallback for local dev without a configured Django.
  const out: Record<string, ProviderKeys> = {};
  for (const [provider, env] of Object.entries(ENV_FALLBACK)) {
    out[provider] = {
      clientID: process.env[env.id] || `dummy-${provider}-id`,
      clientSecret: process.env[env.secret] || `dummy-${provider}-secret`,
      configured: false,
    };
  }
  const serviceToken = process.env.API_TOKEN || "";
  if (!serviceToken) {
    console.warn("[macaco] API_TOKEN not set — OAuth keys come from env fallback only");
    return out;
  }
  try {
    const res = await dataLayerObj.requestApi({
      endpoint: "/oauth-provider/?page_size=100",
      name: "OAuthProviders",
      method: "get",
      headers: { Authorization: `Token ${serviceToken}` },
    });
    const rows = res.data?.results ?? res.data ?? [];
    for (const row of rows as any[]) {
      if (!row?.provider || !ENV_FALLBACK[row.provider]) continue;
      if (row.client_id && row.configured) {
        // Secret is write-only in the API; fetch the full row for it.
        try {
          const full = await dataLayerObj.requestApi({
            endpoint: `/oauth-provider/${row.id}/`,
            name: "OAuthProvider",
            method: "get",
            headers: { Authorization: `Token ${serviceToken}` },
          });
          const secret = (full.data as any)?.client_secret || "";
          if (secret) {
            out[row.provider] = { clientID: row.client_id, clientSecret: secret, configured: true };
            console.log(`[macaco] OAuth keys for ${row.provider} loaded from Django`);
          }
        } catch (err: any) {
          console.warn(`[macaco] could not load secret for ${row.provider}:`, err?.message || err);
        }
      }
    }
  } catch (err: any) {
    console.warn("[macaco] could not load OAuth keys from Django:", err?.message || err);
  }
  return out;
}

async function socialLogin(
  req: any,
  profile: {
    provider: string;
    provider_uid: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
  },
  done: any
) {
  // The proxy verifies with the provider; Django owns the session: it finds
  // the user by provider_uid (else email), creates user + tenant account +
  // Owner roles on first login, and returns the DRF token we stash in session.
  try {
    const serviceToken = process.env.API_TOKEN || "";
    const result = await dataLayerObj.requestApi({
      endpoint: "/auth/social/",
      name: "SocialAuth",
      method: "post",
      data: profile,
      headers: serviceToken ? { Authorization: `Token ${serviceToken}` } : {},
    });
    req.session.user = result.data;
    done(null, result.data.user || profile);
  } catch (err) {
    done(err);
  }
}

const isReal = (keys: ProviderKeys) =>
  keys.configured || (!keys.clientID.startsWith("dummy-") && keys.clientID !== "");

export const initPassport = async (app: any) => {
  const LocalStrategy = passportLocal.Strategy;
  const GoogleStrategy = (passportGoogle as any).Strategy;
  const SlackStrategy = (passportSlack as any).Strategy;
  const GithubStrategy = (passportGithub as any).Strategy;
  const OAuth2Strategy = (passportOauth2 as any).Strategy;

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password", passReqToCallback: true },
      async function (req: any, email: string, password: string, done: any) {
        try {
          const request: RequestType = {
            endpoint: "/auth/login/",
            name: "Auth",
            method: "post",
            data: { email, password },
          };
          const result = await dataLayerObj.requestApi(request);
          const { message, token, user } = result.data;
          if (message === "Login successful" && token && user) {
            // NOTE: passport 0.6 regenerates the session after login,
            // so stash payload on req (not session) here; the route
            // handler copies it into the fresh session after login.
            (req as any).authPayload = result.data;
            return done(null, user);
          }
          return done(null, false, { message: "Invalid email or password." });
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  const keys = await loadProviderKeys();

  if (isReal(keys.google)) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: keys.google.clientID,
          clientSecret: keys.google.clientSecret,
          callbackURL: "/auth/google/callback",
          passReqToCallback: true,
        },
        async (req: any, at: string, rt: string, profile: any, done: any) => {
          const email = profile?.emails?.[0]?.value || "";
          await socialLogin(
            req,
            {
              provider: "google",
              provider_uid: String(profile?.id || ""),
              email,
              first_name: profile?.name?.givenName || "",
              last_name: profile?.name?.familyName || "",
              avatar_url: profile?.photos?.[0]?.value || "",
              access_token: at,
              refresh_token: rt,
            },
            done
          );
        }
      )
    );
  } else {
    console.warn("[macaco] google OAuth not configured — set keys in Django Settings");
  }

  if (isReal(keys.github)) {
    passport.use(
      new GithubStrategy(
        {
          clientID: keys.github.clientID,
          clientSecret: keys.github.clientSecret,
          callbackURL: "/auth/github/callback",
          scope: ["user:email"],
          passReqToCallback: true,
        },
        async (req: any, at: string, rt: string, profile: any, done: any) => {
          const email =
            profile?.emails?.[0]?.value || `${profile?.username || profile?.id}@github.local`;
          await socialLogin(
            req,
            {
              provider: "github",
              provider_uid: String(profile?.id || ""),
              email,
              first_name: (profile?.displayName || "").split(" ")[0] || "",
              last_name: (profile?.displayName || "").split(" ").slice(1).join(" ") || "",
              avatar_url: profile?.photos?.[0]?.value || "",
              access_token: at,
              refresh_token: rt,
            },
            done
          );
        }
      )
    );
  } else {
    console.warn("[macaco] github OAuth not configured — set keys in Django Settings");
  }

  if (isReal(keys.x)) {
    passport.use(
      "x",
      new OAuth2Strategy(
        {
          authorizationURL: "https://twitter.com/i/oauth2/authorize",
          tokenURL: "https://api.twitter.com/2/oauth2/token",
          clientID: keys.x.clientID,
          clientSecret: keys.x.clientSecret,
          callbackURL: "/auth/x/callback",
          scope: ["users.read"],
          passReqToCallback: true,
        },
        async (req: any, at: string, rt: string, _params: any, _profile: any, done: any) => {
          // X has no passport profile strategy; fetch /2/users/me directly.
          try {
            const me = await axios.get("https://api.twitter.com/2/users/me", {
              headers: { Authorization: `Bearer ${at}` },
              timeout: 15000,
            });
            const data = me.data?.data || {};
            const username = data.username || String(data.id || "");
            await socialLogin(
              req,
              {
                provider: "x",
                provider_uid: String(data.id || ""),
                // X rarely exposes email: fall back to a stable synthetic address.
                email: `${username}@x.local`,
                first_name: data.name || username,
                last_name: "",
                avatar_url: "",
                access_token: at,
                refresh_token: rt,
              },
              done
            );
          } catch (err) {
            done(err);
          }
        }
      )
    );
  } else {
    console.warn("[macaco] x OAuth not configured — set keys in Django Settings");
  }

  const azureId = process.env.AZURE_CLIENT_ID || "";
  const azureConfigured = azureId !== "" && !azureId.startsWith("dummy");
  if (AzureStrategy && azureConfigured) {
    try {
    passport.use(
      new AzureStrategy(
        {
          clientID: process.env.AZURE_CLIENT_ID || "dummy-azure-id",
          clientSecret: process.env.AZURE_CLIENT_SECRET || "dummy-azure-secret",
          callbackURL: "/auth/outlook/callback",
          identityMetadata: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
          responseType: "code",
          responseMode: "query",
          passReqToCallback: true,
        },
        async (req: any, _iss: string, profile: any, done: any) => {
          await socialLogin(
            req,
            {
              provider: "outlook",
              provider_uid: String(profile?.oid || ""),
              email: profile?._json?.email || "",
              first_name: profile?.name?.givenName || "",
              last_name: profile?.name?.familyName || "",
            },
            done
          );
        }
      )
    );
    } catch (err) {
      console.warn("Azure/Outlook strategy disabled:", (err as Error).message);
    }
  }

  if (isReal(keys.slack)) {
    passport.use(
      new SlackStrategy(
        {
          clientID: keys.slack.clientID,
          clientSecret: keys.slack.clientSecret,
          callbackURL: "/auth/slack/callback",
          passReqToCallback: true,
        },
        async (req: any, at: string, rt: string, profile: any, done: any) => {
          await socialLogin(
            req,
            {
              provider: "slack",
              provider_uid: String(profile?.id || ""),
              email: profile?.email || "",
              access_token: at,
              refresh_token: rt,
            },
            done
          );
        }
      )
    );
  } else {
    console.warn("[macaco] slack OAuth not configured — set keys in Django Settings");
  }

  passport.serializeUser((user: any, done: any) => done(null, user));
  (passport as any).deserializeUser((u: any, done: any) => done(null, u));
  return passport;
};

export function registerAuthRoutes(app: any) {
  if ((passport as any)._strategy?.google || (passport as any)._strategies?.google) {
    app.get("/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));
    app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), (req: any, res: any) => {
      res.redirect("/");
    });
  }
  if ((passport as any)._strategies?.github) {
    app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
    app.get("/auth/github/callback", passport.authenticate("github", { failureRedirect: "/login" }), (req: any, res: any) => {
      res.redirect("/");
    });
  }
  if ((passport as any)._strategies?.x) {
    app.get("/auth/x", passport.authenticate("x"));
    app.get("/auth/x/callback", passport.authenticate("x", { failureRedirect: "/login" }), (req: any, res: any) => {
      res.redirect("/");
    });
  }
  app.get("/auth/outlook", (req: any, res: any) => {
    const azureId = process.env.AZURE_CLIENT_ID || "";
    if (!AzureStrategy || azureId === "" || azureId.startsWith("dummy"))
      return res.redirect("/login?error=outlook_not_configured");
    passport.authenticate("azuread-openidconnect")(req, res);
  });
  if ((passport as any)._strategies?.slack) {
    app.get("/auth/slack", passport.authenticate("slack" as any));
    app.get("/auth/slack/callback", passport.authenticate("slack" as any, { failureRedirect: "/login" }), (_req: any, res: any) => {
      res.redirect("/");
    });
  }
}
