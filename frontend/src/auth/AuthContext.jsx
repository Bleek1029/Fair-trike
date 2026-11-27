import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAccessToken, setAccessToken, getStoredUser, setStoredUser, clearAuth, apiGetMe, apiRefreshToken } from '../api.js';

// ── Global auth state shared by every page ──────────────
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(Boolean(getAccessToken()));
  // Guard to prevent concurrent auth validation runs (React 18 StrictMode, etc.)
  const validatingRef = React.useRef(false);

  // Try to refresh access token using refresh token (HttpOnly cookie)
  const tryRefreshToken = async () => {
    try {
      const data = await apiRefreshToken();
      setAccessToken(data.accessToken);
      setStoredUser(data.user);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    const token = getAccessToken();

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

    // Add a safety timeout to prevent permanent loading state (60s to cover Render cold starts)
    const safetyTimeout = setTimeout(() => {
      if (!mounted) return;
      validatingRef.current = false;
      console.warn('[AuthProvider] Safety timeout triggered - clearing auth state');
      clearAuth();
      setUser(null);
      setLoading(false);
    }, 60000); // 60 second safety timeout — covers Render free-tier cold starts

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
        clearAuth();
        setUser(null);
        setLoading(false);
        validatingRef.current = false;
        return;
      }

      // Try apiGetMe first
      const tryGetMe = async () => {
        try {
          const data = await apiGetMe();
          return data;
        } catch (err) {
          // If 401, try to refresh token
          if (err.status === 401) {
            const refreshed = await tryRefreshToken();
            if (refreshed) {
              // Retry apiGetMe with new token
              return await apiGetMe();
            }
          }
          throw err;
        }
      };

      try {
        const data = await tryGetMe();
        if (!mounted) {
          validatingRef.current = false;
          return;
        }
        clearTimeout(safetyTimeout);
        setStoredUser(data.user);
        setUser(data.user);
      } catch (err) {
        if (!mounted) {
          validatingRef.current = false;
          return;
        }
        // Token invalid/expired and refresh failed — clear everything.
        console.error('[AuthProvider] Auth validation failed:', err);
        clearAuth();
        setUser(null);
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          setLoading(false);
          validatingRef.current = false;
        }
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      validatingRef.current = false; // Reset for StrictMode remount
    };
  }, []);

  // `remember` (from the sign-in "Remember device" checkbox) selects the
  // backing store: true → localStorage (survives restarts), false →
  // sessionStorage (signed out when the browser closes). Default true keeps
  // auto-login flows (driver register, passenger register) persistent.
  const login = (accessToken, userData, { remember = true } = {}) => {
    setAccessToken(accessToken, { remember });
    setStoredUser(userData);
    setUser(userData);
    setLoading(false);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore logout errors
    }
    clearAuth();
    setUser(null);
    setLoading(false);
  };

  const logoutAll = async () => {
    try {
      await apiLogoutAll();
    } catch {
      // Ignore logout errors
    }
    clearAuth();
    setUser(null);
    setLoading(false);
  };

  const updateUser = (patch) => {
    const next = { ...(user || {}), ...patch };
    setStoredUser(next);
    setUser(next);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, logoutAll, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}