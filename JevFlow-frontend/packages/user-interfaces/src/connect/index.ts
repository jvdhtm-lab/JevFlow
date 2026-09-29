import axios from "axios";
import { DataLayer } from "./DataLayer";

const instance = axios.create({ baseURL: "/", timeout: 30000 });
instance.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            // /auth/me is the session probe; AuthContext handles it locally.
            // A 401 from a real API call means the session is dead.
            const url = err?.config?.url || '';
            const isAuthProbe = url === '/auth/me' || url.endsWith('/auth/me');
            if (!isAuthProbe) {
                try { localStorage.removeItem('jevflow_user'); } catch {}
                window.dispatchEvent(new Event('auth:logout'));
            }
        }
        return Promise.reject(err);
    }
);

export const dataLayerObj = new DataLayer(instance);
export { DataLayer } from "./DataLayer";
export { default as hash } from "./hash";
