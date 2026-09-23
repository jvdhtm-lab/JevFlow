import axios, { AxiosError, AxiosInstance, Method } from "axios";
import hash from "./hash";

export interface RequestType {
    forceNoDedup?: boolean;
    data?: any;
    headers?: any;
    signal?: AbortSignal;
    endpoint: string;
    name: string;
    method?: string;
}

export class DataLayer {
    TIMESTAMP_CACHE: Map<string, number>;
    PROMISE_CACHE: Map<string, Promise<any>>;
    DEDUP_TIME: number;
    debugMode: boolean;
    instance: AxiosInstance;

    constructor(instance: AxiosInstance, debugMode = false) {
        this.instance = instance;
        this.TIMESTAMP_CACHE = new Map<string, number>();
        this.PROMISE_CACHE = new Map<string, Promise<any>>();
        this.DEDUP_TIME = 5000;
        this.debugMode = debugMode;
    }

    dedupRequest(key: string, reqFn: () => Promise<any>, force = false): Promise<any> {
        const lastRequest = this.TIMESTAMP_CACHE.get(key);
        const lastPromise = this.PROMISE_CACHE.get(key);
        const now = Date.now();
        if (!force && lastPromise && lastRequest && now - lastRequest < this.DEDUP_TIME) {
            return lastPromise;
        }
        const promise = reqFn();
        promise.catch((error: any) => {
            const current = this.PROMISE_CACHE.get(key);
            if (current === promise) {
                this.TIMESTAMP_CACHE.delete(key);
                this.PROMISE_CACHE.delete(key);
            }
        });
        this.TIMESTAMP_CACHE.set(key, Date.now());
        this.PROMISE_CACHE.set(key, promise);
        return promise;
    }

    async requestApi(options: RequestType): Promise<any> {
        try {
            const url = options.endpoint.startsWith('/auth/')
                ? options.endpoint
                : `/api${options.endpoint}`;
            const key = hash([options.method, url, options.data, options.headers]);
            if (options.signal) {
                const onAbort = () => {
                    const current = this.PROMISE_CACHE.get(key);
                    if (current) {
                        this.TIMESTAMP_CACHE.delete(key);
                        this.PROMISE_CACHE.delete(key);
                    }
                };
                if (options.signal.aborted) { onAbort(); }
                else { options.signal.addEventListener('abort', onAbort, { once: true }); }
            }
            return await this.dedupRequest(key, () =>
                this.instance({ method: (options.method || "get") as Method, url, data: options.data, headers: options.headers, signal: options.signal }),
                options.forceNoDedup
            );
        } catch (e) {
            if (axios.isCancel(e)) { return undefined; }
            throw e;
        }
    }
}

const instance = axios.create({ baseURL: "/", timeout: 30000 });
instance.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            try { localStorage.removeItem('jevflow_user'); } catch {}
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(err);
    }
);

export const dataLayerObj = new DataLayer(instance);
