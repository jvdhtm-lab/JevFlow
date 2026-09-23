import axios, { AxiosInstance, Method } from "axios";

export interface RequestType {
  endpoint: string;
  name: string;
  method: "get" | "post" | "put" | "delete";
  data?: any;
  headers?: any;
}

export const instance: AxiosInstance = axios.create({ timeout: 30000 });

const inFlight = new Map<string, { ts: number; promise: Promise<any> }>();
const DEDUP_WINDOW_MS = 5000;

function keyFor(r: RequestType): string {
  return `${r.method}:${r.endpoint}:${JSON.stringify(r.data || null)}`;
}

class DataLayerConn {
  async requestApi(request: RequestType): Promise<any> {
    const now = Date.now();
    const key = keyFor(request);
    const pending = inFlight.get(key);
    if (pending && now - pending.ts < DEDUP_WINDOW_MS) return pending.promise;
    const promise = instance({
      method: request.method as Method,
      url: request.endpoint,
      data: request.data,
      headers: request.headers,
    }).finally(() => {
      const cur = inFlight.get(key);
      if (cur && Date.now() - cur.ts >= DEDUP_WINDOW_MS) inFlight.delete(key);
      else setTimeout(() => inFlight.delete(key), DEDUP_WINDOW_MS);
    });
    inFlight.set(key, { ts: now, promise });
    return promise;
  }
}

export const dataLayerObj = new DataLayerConn();
