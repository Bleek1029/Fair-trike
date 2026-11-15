import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { initialsOf, avatarUrl } from '../lib/utils.js';
import { SignOutModal } from './SignOutModal.jsx';

const NAV_LINKS = [
  { label: 'Home', to: '/dashboard' },
  { label: 'Book a Ride', to: '/app' },
  { label: 'Fare Calculator', to: '/app' },
  { label: 'Driver Info', to: '/driver-info' },
];

export function Brand({ to = '/dashboard', compact = false }) {
  return (
    <Link to={to} className="flex items-center gap-space-sm group min-w-0" style={{ textDecoration: 'none' }}>
      <img
        src="/fairtrike-logo.png"
        alt="Fairtrike logo"
        className={`${compact ? 'w-12 h-12' : 'w-12 h-12 md:w-14 md:h-14'} object-contain shrink-0`}
      />
      <div className="flex flex-col min-w-0">
        <span className={`${compact ? 'text-[16px]' : 'text-[16px] md:text-headline-sm'} text-on-surface font-bold tracking-tight leading-tight truncate`}>Fairtrike</span>
        <span className="text-label-sm text-primary tracking-wide uppercase truncate">Tricycle Transit</span>
      </div>
    </Link>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [signOutOpen, setSignOutOpen] = useState(false);

  const confirmSignOut = () => {
    setSignOutOpen(false);
    logout();
  };

  return (
    <header className="w-full bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] sticky top-0 z-40">
      <div className="h-16 md:h-20 w-full max-w-[1280px] mx-auto px-margin lg:px-margin-desktop flex items-center justify-between gap-space-sm md:gap-space-md">
        <div className="flex items-center gap-space-sm min-w-0">
          <Brand />
          <nav className="hidden md:flex items-center gap-space-xs" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-primary text-on-primary shadow-lg'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-space-sm shrink-0">
          <div className="hidden md:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl text-label-sm">
            <span className="material-symbols-outlined text-secondary text-[16px]">person</span>
            <span className="text-on-surface font-medium">{user?.fullname ?? user?.email}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
          </div>
          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-error-container/10 text-error font-bold hover:bg-error-container/20 transition-colors"
          >
            Sign Out
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

export function Footer() {
  return (
    <footer className="w-full py-space-md px-margin lg:px-margin-desktop border-t border-surface-container-high">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-space-sm">
        <p className="text-body-sm text-secondary">© 2025 Fairtrike Olongapo. All rights reserved.</p>
        <div className="flex items-center gap-space-md">
          <a href="https://www.facebook.com/FairtrikeOlongapo" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">facebook</span>
          </a>
          <a href="mailto:support@fairtrike.ph" className="text-secondary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">mail</span>
          </a>
          <a href="https://maps.app.goo.gl/fairtrike" target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">location_on</span>
          </a>
        </div>
      </div>
    </footer>
  );
}