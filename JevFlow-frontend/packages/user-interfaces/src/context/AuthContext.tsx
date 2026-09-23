import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { resources } from "@vhrs/resources";
import { useRItem } from "../components/hooks/useRItem";

interface AuthState {
  isLoggedIn: boolean;
  user: any;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({ isLoggedIn: false, user: null, login: async () => {}, logout: () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("jevflow_user") || "null");
    } catch {
      return null;
    }
  });
  const { createItem } = useRItem((resources as any)._auth_, {
    fetchOnDeclare: false,
    url: "/auth/login/" as any,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res: any = await createItem({ email, password });
      const payload = res?.data || res;
      setUser(payload.user || payload);
      try {
        localStorage.setItem("jevflow_user", JSON.stringify(payload.user || payload));
      } catch {
        /* noop */
      }
    },
    [createItem]
  );

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem("jevflow_user");
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  return <AuthContext.Provider value={{ isLoggedIn: !!user, user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
