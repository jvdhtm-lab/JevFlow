import { useEffect, useCallback, useRef, useState } from "react";
import type { ResourceObject, ResourceOptions } from "@vhrs/resources";
import { makeUrlForItem, makeUrlForItems } from "@vhrs/resources";
import { dataLayerObj } from "../../connect";
import { useDataCacheState, useDataCacheDispatch } from "../../context/DataCache";
import { hid } from "../../context/hash";

interface UseRItemHook {
  error: any;
  data: any;
  total: number;
  isLoading: boolean;
  fetchItem: (force?: boolean, id?: string) => Promise<any>;
  fetchItems: (force?: boolean) => Promise<any>;
  createItem: (data: any) => Promise<any>;
  saveItem: (id: string, newData: any) => Promise<any>;
  deleteItem: (id: string, force?: boolean) => Promise<boolean>;
}

export const useRItem = (resource?: ResourceObject, options?: ResourceOptions): UseRItemHook => {
  const [error, setError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { get, resourceVersions } = useDataCacheState();
  const { set, updateNode, appendNode, removeNode, invalidate, invalidateFiltered, mergeFiltered, bumpResourceVersion } = useDataCacheDispatch();

  const mountedRef = useRef(true);
  const epochRef = useRef(0);
  const loadingCountRef = useRef(0);

  const resourceRef = useRef(resource);
  resourceRef.current = resource;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const getRef = useRef(get);
  getRef.current = get;
  const setRef = useRef(set);
  setRef.current = set;

  const startLoading = () => {
    loadingCountRef.current += 1;
    setIsLoading(true);
  };

  const stopLoading = () => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0 && mountedRef.current) {
      setIsLoading(false);
    }
  };

  const getCacheKey = useCallback((res: ResourceObject, opts?: ResourceOptions): string => {
    if (opts?.url || opts?.sortBy || opts?.filter || opts?.page || opts?.pageSize) {
      return res.name + '::' + hid({
        url: opts?.url,
        sortBy: opts?.sortBy,
        filter: opts?.filter,
        page: opts?.page,
        pageSize: opts?.pageSize,
      }).toString();
    }
    return res.name;
  }, []);

  const fetchItem = useCallback(async (force = false, id?: string): Promise<any> => {
    const res = resourceRef.current;
    if (!res) throw new Error('Resource must be provided.');

    const currentEpoch = ++epochRef.current;
    const opts = optionsRef.current;
    const cacheKey = getCacheKey(res, opts);

    const idNum = id ?? "";
    if (!force && getRef.current(cacheKey)) {
      return getRef.current(cacheKey);
    }

    startLoading();
    setError(null);

    try {
      const request = {
        endpoint: makeUrlForItem(idNum, res, opts),
        name: "fetchItem",
        method: "get",
        forceNoDedup: opts?.forceNoDedup,
        headers: opts?.headers,
      };

      if (opts?.params) {
        (request.endpoint as any).params = opts.params;
      }

      const fetchedData = await dataLayerObj.requestApi(request);

      if (!mountedRef.current || epochRef.current !== currentEpoch) return;

      setRef.current(cacheKey, {
        total: 1,
        nodes: [fetchedData.data],
      });

      return fetchedData;
    } catch (err: any) {
      if (!mountedRef.current || epochRef.current !== currentEpoch) return;
      setError(err);
      throw err;
    } finally {
      stopLoading();
    }
  }, [getCacheKey]);

  const fetchItems = useCallback(async (force = false): Promise<any> => {
    const res = resourceRef.current;
    if (!res) throw new Error('Resource must be provided.');

    const currentEpoch = ++epochRef.current;
    const opts = optionsRef.current;
    const cacheKey = getCacheKey(res, opts);

    if (!force && getRef.current(cacheKey)) {
      return getRef.current(cacheKey);
    }

    startLoading();
    setError(null);
    const url = makeUrlForItems(res, opts);
    console.log(`[useRItem] fetchItems force=${force} url=${url}`);

    try {
      const request = {
        endpoint: makeUrlForItems(res, opts),
        name: "fetchItems",
        method: "get",
        forceNoDedup: opts?.forceNoDedup,
        headers: opts?.headers,
      };

      if (opts?.params) {
        (request.endpoint as any).params = opts.params;
      }

      const fetchedData = await dataLayerObj.requestApi(request);

      if (!mountedRef.current || epochRef.current !== currentEpoch) return;

      const apiData = fetchedData.data;
      const rawNormalized = Array.isArray(apiData) ? apiData : apiData?.results ?? apiData;
      const normalizedData = Array.isArray(rawNormalized) ? rawNormalized : [];
      const total = apiData?.count ?? normalizedData.length;

      setRef.current(cacheKey, { total, nodes: normalizedData });

      if (cacheKey.includes('::')) {
        const mainEntry = getRef.current(res.name);
        if (mainEntry) {
          const byId = new Map((mainEntry.nodes || []).map((n: any) => [n.id, n]));
          for (const n of normalizedData) byId.set(n.id, n);
          setRef.current(res.name, { total: byId.size, nodes: [...byId.values()] });
        }
      }

      return fetchedData;
    } catch (err: any) {
      if (!mountedRef.current || epochRef.current !== currentEpoch) return;
      setError(err);
      throw err;
    } finally {
      stopLoading();
    }
  }, [getCacheKey]);

  const saveItem = useCallback(async (id: string, newData: any): Promise<any> => {
    const res = resourceRef.current;
    if (!res) throw new Error('Resource must be provided.');

    const currentEpoch = ++epochRef.current;
    const opts = optionsRef.current;
    const cacheKey = getCacheKey(res, opts);
    const isNew = !id;

    startLoading();

    try {
      const request = {
        endpoint: isNew ? makeUrlForItems(res, opts) : makeUrlForItem(id, res, opts),
        name: "saveItem",
        method: isNew ? "post" : "put",
        data: newData,
        forceNoDedup: opts?.forceNoDedup,
        headers: opts?.headers,
      };

      const savedData = await dataLayerObj.requestApi(request);

      if (!mountedRef.current || epochRef.current !== currentEpoch) return;

      const mainEntry = getRef.current(res.name);
      if (mainEntry) {
        if (isNew) {
          const nodes = [...(mainEntry.nodes || []), savedData.data];
          setRef.current(res.name, { total: nodes.length, nodes });
        } else {
          const nodes = (mainEntry.nodes || []).map((n: any) => String(n.id) === String(id) ? savedData.data : n);
          setRef.current(res.name, { ...mainEntry, nodes });
        }
      }

      if (cacheKey !== res.name) {
        invalidate(res.name);
      }

      setError(null);
      return savedData;
    } catch (err: any) {
      if (!mountedRef.current || epochRef.current !== currentEpoch) return;
      setError(err);
      throw err;
    } finally {
      stopLoading();
    }
  }, [getCacheKey, invalidate]);

  const deleteItem = useCallback(async (id: string, force = false): Promise<boolean> => {
    const res = resourceRef.current;
    if (!res) throw new Error('Resource must be provided.');

    const currentEpoch = ++epochRef.current;
    const opts = optionsRef.current;
    const cacheKey = getCacheKey(res, opts);

    startLoading();

    try {
      const request = {
        endpoint: makeUrlForItem(id, res, opts),
        name: "deleteItem",
        method: "delete",
        forceNoDedup: opts?.forceNoDedup,
        headers: opts?.headers,
      };

      await dataLayerObj.requestApi(request);

      if (!mountedRef.current || epochRef.current !== currentEpoch) return true;

      invalidate(res.name);
      return true;
    } catch (err: any) {
      if (!mountedRef.current || epochRef.current !== currentEpoch) return true;
      setError(err);
      throw err;
    } finally {
      stopLoading();
    }
  }, [getCacheKey, invalidate]);

  const createItem = useCallback(async (data: any): Promise<any> => {
    const res = resourceRef.current;
    if (!res) throw new Error('Resource must be provided.');
    const currentEpoch = ++epochRef.current;
    const opts = optionsRef.current;
    const cacheKey = getCacheKey(res, opts);
    startLoading();
    try {
      const request = {
        endpoint: makeUrlForItems(res, opts),
        name: "createItem",
        method: "post",
        data,
      };
      const savedData = await dataLayerObj.requestApi(request);
      if (!mountedRef.current || epochRef.current !== currentEpoch) return;
      const mainEntry = getRef.current(res.name);
      const nodes = [...(mainEntry?.nodes || []), savedData.data];
      setRef.current(res.name, { total: nodes.length, nodes });
      invalidate(res.name);
      setError(null);
      return savedData;
    } catch (err: any) {
      if (!mountedRef.current || epochRef.current !== currentEpoch) return;
      setError(err);
      throw err;
    } finally {
      stopLoading();
    }
  }, [getCacheKey]);

  useEffect(() => {
    if (options?.fetchOnDeclare === false) return;
    fetchItems(options?.force);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = get(getCacheKey(resource!, options))?.nodes ?? [];
  const total = get(getCacheKey(resource!, options))?.total ?? 0;
  return { data, total, isLoading, error, fetchItems, fetchItem, createItem, saveItem, deleteItem };
};
