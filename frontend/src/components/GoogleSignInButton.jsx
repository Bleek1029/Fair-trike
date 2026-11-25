import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiGoogleLogin } from '../api.js';

/**
 * "Sign in with Google" button using Google Identity Services.
 *
 * On credential receipt, calls POST /api/auth/google and logs the user in
 * via AuthContext.login(). Falls back gracefully if the Google library
 * hasn't loaded or Google Sign-In isn't configured on the server.
 */
export function GoogleSignInButton({ onSuccess, className = 'w-full' }) {
  const { login } = useAuth();
  const buttonRef = useRef(null);
  const initializedRef = useRef(false);
  const [error, setError] = useState(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredential = useCallback(
    async (credentialResponse) => {
      const { credential } = credentialResponse;
      if (!credential) return;

      try {
        const data = await apiGoogleLogin(credential);
        login(data.accessToken, data.user);
        onSuccess?.();
      } catch (err) {
        setError(err.message);
        const event = new CustomEvent('google-signin-error', { detail: err.message });
        window.dispatchEvent(event);
      }
    },
    [login, onSuccess],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!clientId) {
      setError('Google Sign-In not configured (missing VITE_GOOGLE_CLIENT_ID).');
      return;
    }

    // Poll for the Google library to load (script is async/defer)
    let attempts = 0;
    const maxAttempts = 100; // ~10 seconds
    const timer = setInterval(() => {
      attempts++;
      const libReady =
        window.google && window.google.accounts && window.google.accounts.id;
      if (!libReady) {
        if (attempts >= maxAttempts) {
          clearInterval(timer);
          console.error('[GoogleSignInButton] Google library failed to load.');
          setError('Google Sign-In library failed to load.');
        }
        return;
      }

      clearInterval(timer);

      // Initialize only once per session
      if (!initializedRef.current) {
        initializedRef.current = true;
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredential,
          });
        } catch (err) {
          console.error('[GoogleSignInButton] Initialize failed:', err);
          setError(err.message);
          return;
        }
      }

      // Render (or re-render) the button on every mount — handles StrictMode remounts
      if (buttonRef.current) {
        try {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            logo_alignment: 'center',
            text: 'signin_with',
          });
        } catch (err) {
          console.error('[GoogleSignInButton] Render button failed:', err);
          setError(err.message);
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [handleCredential, clientId]);

  // Render the button div; the Google library injects the actual iframe/button into it.
  return (
    <div ref={buttonRef} className={`${className} mt-2`}>
      {error && (
        <div className="text-[10px] text-error mt-1">{error}</div>
      )}
    </div>
  );
}
