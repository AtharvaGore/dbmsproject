"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, clearToken, getStoredUser, getToken, setStoredUser, setToken } from "@/lib/api";

export interface User {
  user_id: string;
  username: string;
  email: string;
  role: "Student" | "Admin";
  leetcode_username?: string | null;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken();
    const savedUser = getStoredUser();

    if (savedToken) {
      setTokenState(savedToken);
      if (savedUser) setUser(savedUser);

      // Verify token is still valid with backend
      apiFetch<{ user: User }>("/api/auth/me")
        .then((res) => {
          setUser(res.user);
          setStoredUser(res.user);
        })
        .catch(() => {
          // Token expired or invalid
          clearToken();
          setUser(null);
          setTokenState(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setStoredUser(newUser);
    setTokenState(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setTokenState(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiFetch<{ user: User }>("/api/auth/me");
      setUser(res.user);
      setStoredUser(res.user);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
