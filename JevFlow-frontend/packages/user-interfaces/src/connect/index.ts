import axios from "axios";
import { DataLayer } from "./DataLayer";

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
export { DataLayer } from "./DataLayer";
export { default as hash } from "./hash";
