import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { initialsOf, avatarUrl } from '../lib/utils.js';
import { SignOutModal } from './SignOutModal.jsx';

export function MobileHeader() {
  const { user, logout } = useAuth();
  const [signOutOpen, setSignOutOpen] = React.useState(false);
  const confirmSignOut = () => {
    setSignOutOpen(false);
    logout();
  };
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-margin flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-space-sm" style={{ textDecoration: 'none' }}>
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-[20px]">electric_rickshaw</span>
          </div>
          <div className="flex flex-col">
            <span className="text-headline-sm text-primary leading-tight font-bold">Fairtrike</span>
            <span className="text-label-sm text-secondary uppercase tracking-wider">Olongapo City</span>
          </div>
        </Link>
        <div className="flex items-center gap-space-sm">
          <div className="flex items-center gap-space-xs px-space-sm py-1 bg-secondary-container/40 rounded-full">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-label-sm text-on-secondary-container">Active Zone</span>
          </div>
          <Link to="/dashboard" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors" aria-label="Account">
            {user?.profilePicture ? (
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                src={avatarUrl(user.profilePicture)}
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-primary text-on-primary text-label-sm font-bold flex items-center justify-center">
                {initialsOf(user?.fullname)}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            aria-label="Sign out"
            title="Sign out"
            className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
          </button>
        </div>
      </div>
      <SignOutModal
        open={signOutOpen}
        onConfirm={confirmSignOut}
        onClose={() => setSignOutOpen(false)}
        name={user?.fullname}
      />
    </header>
  );
}
