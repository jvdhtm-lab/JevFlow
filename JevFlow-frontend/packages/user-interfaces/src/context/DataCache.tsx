import { createContext, useContext, useReducer, useState, ReactNode, useCallback, useRef, useMemo } from 'react';

export interface CacheEntry {
  total: number;
  nodes: any[];
}

interface DataCache {
  [key: string]: CacheEntry;
}

interface DataCacheStateContextType {
  state: DataCache;
  get: (key: string) => CacheEntry | undefined;
  resourceVersions: Record<string, number>;
}

interface DataCacheDispatchContextType {
  set: (key: string, entry: CacheEntry) => void;
  updateNode: (key: string, id: string | number, data: any) => void;
  appendNode: (key: string, data: any) => void;
  removeNode: (key: string, id: string | number) => void;
  updateNodeAll: (resourceName: string, id: string | number, data: any) => void;
  appendNodeAll: (resourceName: string, data: any) => void;
  removeNodeAll: (resourceName: string, id: string | number) => void;
  invalidate: (resourceName: string) => void;
  invalidateFiltered: (resourceName: string) => void;
  mergeFiltered: (resourceName: string, nodes: any[], total: number) => void;
  bumpResourceVersion: (resourceName: string) => void;
}

const DataCacheStateContext = createContext<DataCacheStateContextType | undefined>(undefined);
const DataCacheDispatchContext = createContext<DataCacheDispatchContextType | undefined>(undefined);

type Action =
  | { type: 'SET'; key: string; entry: CacheEntry }
  | { type: 'UPDATE_NODE'; key: string; id: string | number; data: any }
  | { type: 'APPEND_NODE'; key: string; data: any }
  | { type: 'REMOVE_NODE'; key: string; id: string | number }
  | { type: 'UPDATE_NODE_ALL'; resourceName: string; id: string | number; data: any }
  | { type: 'APPEND_NODE_ALL'; resourceName: string; data: any }
  | { type: 'REMOVE_NODE_ALL'; resourceName: string; id: string | number }
  | { type: 'INVALIDATE'; resourceName: string }
  | { type: 'INVALIDATE_FILTERED'; resourceName: string }
  | { type: 'MERGE_FILTERED'; resourceName: string; nodes: any[]; total: number };

const dataCacheReducer = (state: DataCache, action: Action): DataCache => {
  switch (action.type) {
    case 'SET': {
      return { ...state, [action.key]: action.entry };
    }
    case 'UPDATE_NODE': {
      const entry = state[action.key];
      if (!entry || !Array.isArray(entry.nodes)) return state;
      const nodes = entry.nodes.map((n: any) =>
        String(n.id) === String(action.id) ? action.data : n
      );
      return { ...state, [action.key]: { ...entry, nodes } };
    }
    case 'APPEND_NODE': {
      const entry = state[action.key];
      if (!entry || !Array.isArray(entry.nodes)) return state;
      return {
        ...state,
        [action.key]: { total: entry.total + 1, nodes: [...entry.nodes, action.data] },
      };
    }
    case 'REMOVE_NODE': {
      const entry = state[action.key];
      if (!entry || !Array.isArray(entry.nodes)) return state;
      const nodes = entry.nodes.filter((n: any) => String(n.id) !== String(action.id));
      return {
        ...state,
        [action.key]: { total: Math.max(0, entry.total - 1), nodes },
      };
    }
    case 'UPDATE_NODE_ALL': {
      const newState = { ...state };
      for (const key of Object.keys(newState)) {
        if (key === action.resourceName || key.startsWith(action.resourceName + '::')) {
          const entry = newState[key];
          if (entry && Array.isArray(entry.nodes)) {
            newState[key] = { ...entry, nodes: entry.nodes.map((n: any) => String(n.id) === String(action.id) ? action.data : n) };
          }
        }
      }
      return newState;
    }
    case 'APPEND_NODE_ALL': {
      const newState = { ...state };
      for (const key of Object.keys(newState)) {
        if (key === action.resourceName || key.startsWith(action.resourceName + '::')) {
          const entry = newState[key];
          if (entry && Array.isArray(entry.nodes)) {
            newState[key] = { total: entry.total + 1, nodes: [...entry.nodes, action.data] };
          }
        }
      }
      return newState;
    }
    case 'REMOVE_NODE_ALL': {
      const newState = { ...state };
      for (const key of Object.keys(newState)) {
        if (key === action.resourceName || key.startsWith(action.resourceName + '::')) {
          const entry = newState[key];
          if (entry && Array.isArray(entry.nodes)) {
            const nodes = entry.nodes.filter((n: any) => String(n.id) !== String(action.id));
            newState[key] = { total: Math.max(0, entry.total - 1), nodes };
          }
        }
      }
      return newState;
    }
    case 'INVALIDATE': {
      const newState = { ...state };
      for (const key of Object.keys(newState)) {
        if (key === action.resourceName || key.startsWith(action.resourceName + '::')) {
          delete newState[key];
        }
      }
      return newState;
    }
    case 'INVALIDATE_FILTERED': {
      const newState = { ...state };
      for (const key of Object.keys(newState)) {
        if (key.startsWith(action.resourceName + '::')) {
          delete newState[key];
        }
      }
      return newState;
    }
    case 'MERGE_FILTERED': {
      const mainKey = action.resourceName;
      const existing = state[mainKey];
      const existingMap = new Map<number | string, any>();
      if (existing && Array.isArray(existing.nodes)) {
        existing.nodes.forEach((n: any) => existingMap.set(String(n.id), n));
      }
      action.nodes.forEach((n: any) => {
        const id = String(n.id);
        if (existingMap.has(id)) {
          existingMap.set(id, n);
        } else {
          existingMap.set(id, n);
        }
      });
      const mergedNodes = Array.from(existingMap.values());
      const existingNodes = existing && Array.isArray(existing.nodes) ? existing.nodes : [];
      const newTotal = existingNodes.length > 0 ? existing.total + action.nodes.filter((n: any) => !existingNodes.some((e: any) => String(e.id) === String(n.id))).length : action.total;
      return { ...state, [mainKey]: { total: newTotal, nodes: mergedNodes } };
    }
    default:
      return state;
  }
};

const useCreateDataCache = () => {
  const [state, dispatch] = useReducer(dataCacheReducer, {} as DataCache);
  const [resourceVersions, setResourceVersions] = useState<Record<string, number>>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const get = useCallback((key: string): CacheEntry | undefined => {
    return stateRef.current[key];
  }, []);

  const set = useCallback((key: string, entry: CacheEntry): void => {
    dispatch({ type: 'SET', key, entry });
  }, []);

  const updateNode = useCallback((key: string, id: string | number, data: any): void => {
    dispatch({ type: 'UPDATE_NODE', key, id, data });
  }, []);

  const appendNode = useCallback((key: string, data: any): void => {
    dispatch({ type: 'APPEND_NODE', key, data });
  }, []);

  const removeNode = useCallback((key: string, id: string | number): void => {
    dispatch({ type: 'REMOVE_NODE', key, id });
  }, []);

  const updateNodeAll = useCallback((resourceName: string, id: string | number, data: any): void => {
    dispatch({ type: 'UPDATE_NODE_ALL', resourceName, id, data });
  }, []);

  const appendNodeAll = useCallback((resourceName: string, data: any): void => {
    dispatch({ type: 'APPEND_NODE_ALL', resourceName, data });
  }, []);

  const removeNodeAll = useCallback((resourceName: string, id: string | number): void => {
    dispatch({ type: 'REMOVE_NODE_ALL', resourceName, id });
  }, []);

  const invalidate = useCallback((resourceName: string): void => {
    dispatch({ type: 'INVALIDATE', resourceName });
  }, []);

  const invalidateFiltered = useCallback((resourceName: string): void => {
    dispatch({ type: 'INVALIDATE_FILTERED', resourceName });
  }, []);

  const mergeFiltered = useCallback((resourceName: string, nodes: any[], total: number): void => {
    dispatch({ type: 'MERGE_FILTERED', resourceName, nodes, total });
  }, []);

  const bumpResourceVersion = useCallback((resourceName: string): void => {
    setResourceVersions(prev => {
      const next = (prev[resourceName] || 0) + 1;
      return { ...prev, [resourceName]: next };
    });
  }, []);

  return { state, get, set, updateNode, appendNode, removeNode, updateNodeAll, appendNodeAll, removeNodeAll, invalidate, invalidateFiltered, mergeFiltered, resourceVersions, bumpResourceVersion };
};

interface DataCacheProviderProps {
  children: ReactNode;
}

export const DataCacheProvider = ({ children }: DataCacheProviderProps) => {
  const { state, get, set, updateNode, appendNode, removeNode, updateNodeAll, appendNodeAll, removeNodeAll, invalidate, invalidateFiltered, mergeFiltered, resourceVersions, bumpResourceVersion } = useCreateDataCache();

  const stateValue = useMemo(() => ({ state, get, resourceVersions }), [state, get, resourceVersions]);
  const dispatchValue = useMemo(
    () => ({ set, updateNode, appendNode, removeNode, updateNodeAll, appendNodeAll, removeNodeAll, invalidate, invalidateFiltered, mergeFiltered, bumpResourceVersion }),
    [set, updateNode, appendNode, removeNode, updateNodeAll, appendNodeAll, removeNodeAll, invalidate, invalidateFiltered, mergeFiltered, bumpResourceVersion]
  );

  return (
    <DataCacheStateContext.Provider value={stateValue}>
      <DataCacheDispatchContext.Provider value={dispatchValue}>
        {children}
      </DataCacheDispatchContext.Provider>
    </DataCacheStateContext.Provider>
  );
};

export const useDataCacheState = (): DataCacheStateContextType => {
  const context = useContext(DataCacheStateContext);
  if (!context) {
    throw new Error('useDataCacheState must be used within a DataCacheProvider');
  }
  return context;
};

export const useDataCacheDispatch = (): DataCacheDispatchContextType => {
  const context = useContext(DataCacheDispatchContext);
  if (!context) {
    throw new Error('useDataCacheDispatch must be used within a DataCacheProvider');
  }
  return context;
};
