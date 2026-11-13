import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken, getStoredUser, setStoredUser, apiGetMe } from '../api.js';

// ── Global auth state shared by every page ──────────────
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    // If we have a token, validate it against the server on startup.
    if (!getToken()) {
      setLoading(false);
      return;
    }

    // Add a safety timeout to prevent permanent loading state
    const safetyTimeout = setTimeout(() => {
      console.warn('[AuthProvider] Safety timeout triggered - clearing auth state');
      setToken(null);
      setStoredUser(null);
      setUser(null);
      setLoading(false);
    }, 10000); // 10 second safety timeout

    apiGetMe()
      .then((data) => {
        clearTimeout(safetyTimeout);
        setStoredUser(data.user);
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(safetyTimeout);
        // Token invalid/expired — clear everything.
        setToken(null);
        setStoredUser(null);
        setUser(null);
        setLoading(false);
      });
  }, []);

  // `remember` (from the sign-in "Remember device" checkbox) selects the
  // backing store: true → localStorage (survives restarts), false →
  // sessionStorage (signed out when the browser closes). Default true keeps
  // auto-login flows (driver register, passenger register) persistent.
  const login = (token, userData, { remember = true } = {}) => {
    setToken(token, { remember });
    setStoredUser(userData);
    setUser(userData);
    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    setLoading(false);
  };

  const updateUser = (patch) => {
    const next = { ...(user || {}), ...patch };
    setStoredUser(next);
    setUser(next);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}