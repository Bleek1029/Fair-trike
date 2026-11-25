import React, { useEffect, useRef, useCallback } from 'react';
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

  const handleCredential = useCallback(
    async (credentialResponse) => {
      const { credential } = credentialResponse;
      if (!credential) return;

      try {
        const data = await apiGoogleLogin(credential);
        login(data.accessToken, data.user);
        onSuccess?.();
      } catch (err) {
        // Surface the error so the parent page can show it
        const event = new CustomEvent('google-signin-error', { detail: err.message });
        window.dispatchEvent(event);
      }
    },
    [login, onSuccess],
  );

  useEffect(() => {
    // Avoid double-initialization (StrictMode, remounts)
    if (initializedRef.current || typeof window === 'undefined') return;
    if (!window.google || !window.google.accounts || !window.google.accounts.id) return;

    initializedRef.current = true;

    try {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: handleCredential,
      });

      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          logo_alignment: 'center',
          text: 'signin_with',
        });
      }
    } catch {
      // Google not ready yet; button will remain hidden
    }
  }, [handleCredential]);

  // Render the button div; the Google library injects the actual iframe/button into it.
  return (
    <div
      ref={buttonRef}
      className={`${className} mt-2`}
      style={{ display: initializedRef.current ? 'block' : 'none' }}
    />
  );
}
