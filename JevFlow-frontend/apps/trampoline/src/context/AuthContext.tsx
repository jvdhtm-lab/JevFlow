import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { resources } from "@vhrs/resources";
import { useRItem } from "@vhrs/user-interfaces";

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: any;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  isLoading: true,
  user: null,
  login: async () => {},
  logout: () => {},
});

const STORAGE_KEY = "jevflow_user";

function readStoredUser(): any {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

// All auth traffic goes through useRItem (never raw fetch): the hook handles
// the /api prefix, caching, dedup and the shared 401 handling.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginReq = useRItem(resources._auth_, { url: "/auth/login/", fetchOnDeclare: false });
  const logoutReq = useRItem(resources._auth_, { url: "/auth/logout", fetchOnDeclare: false });
  const meReq = useRItem(resources._auth_, { url: "/auth/me", fetchOnDeclare: false });

  const logout = useCallback(async () => {
    try {
      await logoutReq.createItem({});
    } catch {
      /* best effort — still clear local state below */
    }
    clearStoredUser();
    setUser(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate any stored session on page load: never render authed pages
  // with a dead session (that showed up as empty lists everywhere).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = readStoredUser();
      if (!stored) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const res = await meReq.fetchItems(true);
        if (cancelled) return;
        const data = res?.data;
        if (data && (data.user || data.token)) {
          setUser(data.user || data);
        } else {
          clearStoredUser();
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fired by the shared axios 401 interceptor on any API call.
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener("auth:logout", onExpired);
    return () => window.removeEventListener("auth:logout", onExpired);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginReq.createItem({ email, password });
    const data = res?.data ?? {};
    if (!data.token) throw new Error("Login failed");
    const u = data.user || data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      /* noop */
    }
    setUser(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
