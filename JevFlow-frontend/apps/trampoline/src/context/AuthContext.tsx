import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  const loginEpochRef = useRef(0);

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

  // Validate the server session on every page load. Social login never writes
  // to localStorage, so we must ask macaco whether a session cookie exists.
  useEffect(() => {
    let cancelled = false;
    const checkEpoch = loginEpochRef.current;
    (async () => {
      try {
        const res = await meReq.fetchItems(true);
        // If the user logged in while this probe was in flight, ignore it.
        if (cancelled || loginEpochRef.current !== checkEpoch) return;
        const data = res?.data;
        if (data && (data.user || data.token)) {
          const u = data.user || data;
          setUser(u);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
          } catch {
            /* noop */
          }
        } else {
          clearStoredUser();
          setUser(null);
        }
      } catch {
        if (cancelled || loginEpochRef.current !== checkEpoch) return;
        clearStoredUser();
        setUser(null);
      } finally {
        if (!cancelled && loginEpochRef.current === checkEpoch) setIsLoading(false);
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
    loginEpochRef.current += 1;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      /* noop */
    }
    setUser(u);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
