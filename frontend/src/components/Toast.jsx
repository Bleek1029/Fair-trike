import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { Icon } from './Icon.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type: options.type || 'info', // 'info' | 'success' | 'warning' | 'error'
      duration: options.duration ?? 4000,
      action: options.action,
    };
    setToasts(prev => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => removeToast(id), toast.duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, options) => addToast(message, { ...options, type: 'success' }), [addToast]);
  const error = useCallback((message, options) => addToast(message, { ...options, type: 'error' }), [addToast]);
  const warning = useCallback((message, options) => addToast(message, { ...options, type: 'warning' }), [addToast]);
  const info = useCallback((message, options) => addToast(message, { ...options, type: 'info' }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  const typeStyles = {
    info: 'bg-primary-container text-on-primary-container border-primary-container/30',
    success: 'bg-tertiary-container text-on-tertiary-container border-tertiary-container/30',
    warning: 'bg-warning-container text-on-warning-container border-warning-container/30',
    error: 'bg-error-container text-on-error-container border-error-container/30',
  };

  const typeIcons = {
    info: 'info',
    success: 'check_circle',
    warning: 'warning',
    error: 'error',
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-slide-up ${typeStyles[toast.type]} border shadow-xl rounded-xl p-4 flex items-start gap-3`}
          role="alert"
          aria-live="polite"
        >
          <Icon name={typeIcons[toast.type]} size={22} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-body-md">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                onClick={() => { toast.action.onClick(); onRemove(toast.id); }}
                className="mt-2 text-sm font-bold underline hover:no-underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="p-1 rounded-full hover:bg-black/10 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <Icon name="close" size={18} className="opacity-70" />
          </button>
        </div>
      ))}
    </div>
  );
}