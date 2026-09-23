import { Method } from "axios";

export interface RequestType {
    forceNoDedup?: boolean,
    data?: any,
    headers?: any,
    signal?: AbortSignal,
    endpoint: string;
    name: string;
    method: Method | undefined,
}
