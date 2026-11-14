import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken, getStoredUser, setStoredUser, apiGetMe } from '../api.js';

// ── Global auth state shared by every page ──────────────
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(Boolean(getToken()));
  // Guard to prevent concurrent auth validation runs (React 18 StrictMode, etc.)
  const validatingRef = React.useRef(false);

  useEffect(() => {
    let mounted = true;
    const token = getToken();

    // If we have no token, clear loading immediately
    if (!token) {
      if (mounted) setLoading(false);
      return;
    }

    // Skip if already validating (prevents double-invoke loop)
    if (validatingRef.current) {
      console.log('[AuthProvider] Skipping duplicate validation');
      return;
    }
    validatingRef.current = true;

    // Add a safety timeout to prevent permanent loading state
    const safetyTimeout = setTimeout(() => {
      if (!mounted) return;
      validatingRef.current = false;
      console.warn('[AuthProvider] Safety timeout triggered - clearing auth state');
      setToken(null);
      setStoredUser(null);
      setUser(null);
      setLoading(false);
    }, 60000); // 60 second safety timeout (accounts for Render free tier cold starts)

    // Async IIFE for health check + apiGetMe
    (async () => {
      // Backend health check with longer timeout for Render cold starts (free tier spins down after 15min)
      // Cold start can take 30-60s on Render free tier
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort(), 45000);
      try {
        const healthRes = await fetch('/api/health', { signal: healthController.signal });
        clearTimeout(healthTimeout);
        if (!healthRes.ok) throw new Error('Backend health check failed');
        console.log('[AuthProvider] Backend health check passed');
      } catch (healthErr) {
        clearTimeout(healthTimeout);
        if (!mounted) {
          validatingRef.current = false;
          return;
        }
        clearTimeout(safetyTimeout);
        console.error('[AuthProvider] Backend unreachable:', healthErr);
        setToken(null);
        setStoredUser(null);
        setUser(null);
        setLoading(false);
        validatingRef.current = false;
        return;
      }

      apiGetMe()
        .then((data) => {
          if (!mounted) {
            validatingRef.current = false;
            return;
          }
          clearTimeout(safetyTimeout);
          setStoredUser(data.user);
          setUser(data.user);
          setLoading(false);
          validatingRef.current = false;
        })
        .catch((err) => {
          if (!mounted) {
            validatingRef.current = false;
            return;
          }
          clearTimeout(safetyTimeout);
          // Token invalid/expired — clear everything.
          console.error('[AuthProvider] Auth validation failed:', err);
          setToken(null);
          setStoredUser(null);
          setUser(null);
          setLoading(false);
          validatingRef.current = false;
        });
    })();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };
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