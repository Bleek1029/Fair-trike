import React, { createContext, useContext, useState, useCallback } from 'react';
import { BrandLoader } from '../components/BrandLoader.jsx';

// ── Global page-transition loader ──
// `showLoading('msg')` displays the branded FT overlay; `hideLoading()` removes it.
const LoadingContext = createContext({ showLoading: () => {}, hideLoading: () => {} });

export function usePageLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }) {
  const [state, setState] = useState(null);

  const showLoading = useCallback((message = 'Loading your ride...') => {
    setState({ message });
  }, []);

  const hideLoading = useCallback(() => {
    setState(null);
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      {state && <BrandLoader overlay message={state.message} />}
    </LoadingContext.Provider>
  );
}

// Helper: show the overlay for at least `minMs`, run `fn`, then hide.
export async function withPageLoading(showLoading, hideLoading, message, fn, minMs = 600) {
  showLoading(message);
  const started = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - started;
    if (elapsed < minMs) {
      await new Promise((r) => setTimeout(r, minMs - elapsed));
    }
    hideLoading();
  }
}
