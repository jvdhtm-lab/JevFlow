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
  const { set, updateNodeAll, appendNode, removeNode, removeNodeAll, invalidateFiltered, mergeFiltered, bumpResourceVersion } = useDataCacheDispatch();

  const mountedRef = useRef(true);
  const fetchOnDeclareStartedRef = useRef(false);
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
  const mergeFilteredRef = useRef(mergeFiltered);
  mergeFilteredRef.current = mergeFiltered;

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
    if (!res) return "";
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
      const request: any = {
        endpoint: makeUrlForItem(idNum, res, opts),
        name: "fetchItem",
        method: "get",
        forceNoDedup: force || opts?.forceNoDedup,
        headers: opts?.headers,
      };

      if (opts?.params) {
        request.endpoint.params = opts.params;
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

    try {
      const request: any = {
        endpoint: makeUrlForItems(res, opts),
        name: "fetchItems",
        method: "get",
        forceNoDedup: force || opts?.forceNoDedup,
        headers: opts?.headers,
      };

      if (opts?.params) {
        request.endpoint.params = opts.params;
      }

      const fetchedData = await dataLayerObj.requestApi(request);

      if (!mountedRef.current || epochRef.current !== currentEpoch) return;

      const apiData = fetchedData.data;
      const rawNormalized = Array.isArray(apiData) ? apiData : apiData?.results ?? apiData;
      const normalizedData = Array.isArray(rawNormalized) ? rawNormalized : [];
      const total = apiData?.count ?? normalizedData.length;

      setRef.current(cacheKey, { total, nodes: normalizedData });

      if (cacheKey.includes('::')) {
        mergeFilteredRef.current(res.name, normalizedData, total);
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
      const request: any = {
        endpoint: isNew ? makeUrlForItems(res, opts) : makeUrlForItem(id, res, opts),
        name: "saveItem",
        method: isNew ? "post" : "patch",
        data: newData,
        forceNoDedup: true,
        headers: opts?.headers,
      };

      const savedData = await dataLayerObj.requestApi(request);

      if (!mountedRef.current || epochRef.current !== currentEpoch) return;

      if (isNew) {
        const mainEntry = getRef.current(res.name);
        if (mainEntry) {
          appendNode(res.name, savedData.data);
        }
        if (cacheKey !== res.name) {
          invalidateFiltered(res.name);
        }
        bumpResourceVersion(res.name);
      } else {
        // Update the node in every cached list (main + filtered) so callers
        // re-render only where the data changed, without a full list refetch.
        updateNodeAll(res.name, id, savedData.data);
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
  }, [getCacheKey, updateNodeAll, appendNode, invalidateFiltered, bumpResourceVersion]);

  const deleteItem = useCallback(async (id: string, force = false): Promise<boolean> => {
    const res = resourceRef.current;
    if (!res) throw new Error('Resource must be provided.');

    const currentEpoch = ++epochRef.current;
    const opts = optionsRef.current;
    const cacheKey = getCacheKey(res, opts);

    startLoading();

    try {
      const request: any = {
        endpoint: makeUrlForItem(id, res, opts),
        name: "deleteItem",
        method: "delete",
        forceNoDedup: force,
        headers: opts?.headers,
      };

      await dataLayerObj.requestApi(request);

      if (!mountedRef.current || epochRef.current !== currentEpoch) return false;

      removeNodeAll(res.name, id);

      if (cacheKey !== res.name) {
        invalidateFiltered(res.name);
      }

      bumpResourceVersion(res.name);

      setError(null);
      return true;
    } catch (err: any) {
      if (!mountedRef.current || epochRef.current !== currentEpoch) return false;
      setError(err);
      return false;
    } finally {
      stopLoading();
    }
  }, [getCacheKey, removeNodeAll, invalidateFiltered, bumpResourceVersion]);

  const createItem = useCallback(async (data: any): Promise<any> => {
    const res = resourceRef.current;
    if (!res) throw new Error('Resource must be provided.');
    const currentEpoch = ++epochRef.current;
    const opts = optionsRef.current;
    const cacheKey = getCacheKey(res, opts);
    startLoading();
    try {
      const request: any = {
        endpoint: makeUrlForItems(res, opts),
        name: "createItem",
        method: "post",
        data,
        forceNoDedup: true,
        headers: opts?.headers,
      };
      const savedData = await dataLayerObj.requestApi(request);
      if (!mountedRef.current || epochRef.current !== currentEpoch) return;
      const mainEntry = getRef.current(res.name);
      if (mainEntry) {
        appendNode(res.name, savedData.data);
      }
      if (cacheKey !== res.name) {
        invalidateFiltered(res.name);
      }
      bumpResourceVersion(res.name);
      setError(null);
      return savedData;
    } catch (err: any) {
      if (!mountedRef.current || epochRef.current !== currentEpoch) return;
      setError(err);
      throw err;
    } finally {
      stopLoading();
    }
  }, [getCacheKey, appendNode, invalidateFiltered, bumpResourceVersion]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!resource || options?.fetchOnDeclare === false) return;
    if (fetchOnDeclareStartedRef.current) return;
    fetchOnDeclareStartedRef.current = true;
    void fetchItems(!!options?.force);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, options?.fetchOnDeclare]);

  // forceFetchOnWinBlur: refetch when window regains focus
  useEffect(() => {
    if (!options?.forceFetchOnWinBlur || !resource) return;
    const handleFocus = () => void fetchItems(true);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [options?.forceFetchOnWinBlur, resource, fetchItems]);

  // forceFetchOnNavigation: refetch on route change
  const prevPathRef = useRef(window.location.pathname);
  useEffect(() => {
    if (!options?.forceFetchOnNavigation || !resource) return;
    const handlePopState = () => {
      const newPath = window.location.pathname;
      if (prevPathRef.current !== newPath) {
        prevPathRef.current = newPath;
        void fetchItems(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [options?.forceFetchOnNavigation, resource, fetchItems]);

  // resourceVersions: refetch when save/create/delete bumps the version
  const resourceVersion = resource ? (resourceVersions[resource.name] || 0) : 0;
  const prevVersionRef = useRef(0);
  useEffect(() => {
    if (!resource || resourceVersion === 0) return;
    if (prevVersionRef.current === resourceVersion) return;
    prevVersionRef.current = resourceVersion;
    void fetchItems(true);
  }, [resourceVersion, resource, fetchItems]);

  const data = resource ? (get(getCacheKey(resource, options))?.nodes ?? []) : [];
  const total = resource ? (get(getCacheKey(resource, options))?.total ?? 0) : 0;
  return { data, total, isLoading, error, fetchItems, fetchItem, createItem, saveItem, deleteItem };
};
