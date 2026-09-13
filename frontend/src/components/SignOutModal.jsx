import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Confirmation modal for signing out.
 * Replaces native window.confirm with an M3-styled dialog.
 *
 * @param {boolean}  open     Whether the modal is visible.
 * @param {Function} onConfirm Called when the user confirms sign out.
 * @param {Function} onClose   Called on cancel, backdrop click, or Escape.
 * @param {string}   [name]    Optional display name of the user signing out.
 */
export function SignOutModal({ open, onConfirm, onClose, name }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Portal into <body> so the fixed overlay is centered against the viewport,
  // not clipped by the header's backdrop-filter containing block.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-margin bg-inverse-surface/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[340px] rounded-2xl bg-surface-container-high text-on-surface shadow-2xl p-space-lg flex flex-col gap-space-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">logout</span>
        </div>

        <div className="flex flex-col gap-space-xs">
          <h2 id="signout-title" className="text-headline-sm font-bold">Sign out?</h2>
          <p className="text-body-md text-on-surface-variant">
            {name ? `You'll be signed out of your ${name} account.` : 'You will need to sign in again to book rides.'}
          </p>
        </div>

        <div className="flex justify-end gap-space-sm pt-space-xs">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="px-space-md h-[40px] rounded-full text-label-lg font-bold text-primary hover:bg-primary/8 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-space-md h-[40px] rounded-full text-label-lg font-bold bg-error text-on-error hover:brightness-95 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}