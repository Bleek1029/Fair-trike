import React, { useEffect, useState } from 'react';

// ── "Install App" prompt (Chrome/Edge beforeinstallprompt) ──
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  );

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  const install = async () => {
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <button
      type="button"
      onClick={install}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-container text-label-lg font-bold shadow-lg hover:bg-primary-fixed-dim transition-all"
      aria-label="Install Fairtrike app"
    >
      <span className="material-symbols-outlined text-[20px]">install_mobile</span>
      Install App
    </button>
  );
}