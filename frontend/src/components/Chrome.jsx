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
      <div className={`${compact ? 'w-8 h-8 rounded-lg' : 'w-8 h-8 md:w-10 md:h-10 md:rounded-xl'} bg-primary-container flex items-center justify-center shadow-sm shrink-0`}>
        <span className={`material-symbols-outlined text-on-primary-container ${compact ? 'text-[20px]' : 'text-[20px] md:text-[24px]'}`}>electric_rickshaw</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`${compact ? 'text-[16px]' : 'text-[16px] md:text-headline-sm'} text-on-surface font-bold tracking-tight leading-tight truncate`}>Fairtrike</span>
        <span className="text-label-sm text-primary tracking-wide uppercase truncate">Olongapo City Transit</span>
      </div>
    </Link>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const loggedIn = Boolean(user);

  const confirmSignOut = () => {
    setSignOutOpen(false);
    setMenuOpen(false);
    logout();
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 md:h-20 w-full max-w-[1280px] mx-auto px-margin lg:px-margin-desktop flex items-center justify-between gap-space-sm md:gap-space-md">
        <div className="flex items-center gap-space-md min-w-0">
          <Brand />
          <nav className="hidden lg:flex items-center gap-space-xs p-space-xs bg-surface-container-low rounded-xl">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'px-space-md py-space-sm rounded-lg transition-colors bg-surface-container-high text-on-surface font-bold'
                      : 'px-space-md py-space-sm rounded-lg text-on-surface-variant hover:text-on-surface transition-colors text-label-lg'
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-space-sm md:gap-space-md shrink-0">
          <div className="hidden md:flex items-center bg-surface-container-low px-space-md py-space-xs rounded-full gap-space-sm">
            <span className="material-symbols-outlined text-secondary text-[20px]">radar</span>
            <span className="text-label-md text-on-surface-variant">Transit Live:</span>
            <span className="text-label-md text-tertiary flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              Active
            </span>
          </div>

          {loggedIn ? (
            <div className="flex items-center gap-space-sm">
              <Link
                to="/dashboard"
                className="hidden sm:inline-block px-space-md py-2.5 rounded-xl bg-surface-container-high text-on-surface text-label-lg font-bold hover:bg-surface-container transition-all"
              >
                My Account
              </Link>
              <button
                type="button"
                onClick={() => setSignOutOpen(true)}
                className="hidden sm:inline-block px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface text-label-lg hover:bg-surface-container-high transition-all"
              >
                Sign Out
              </button>
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary text-label-sm font-bold overflow-hidden">
                {user.profilePicture ? (
                  <img
                    src={avatarUrl(user.profilePicture)}
                    alt={user.fullname || 'profile'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  initialsOf(user.fullname)
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-space-xs sm:gap-space-sm">
              <Link
                to="/login"
                className="hidden sm:inline-block px-space-md py-2.5 rounded-xl text-label-lg text-on-surface hover:bg-surface-container-high transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-space-md sm:px-space-lg py-2.5 rounded-xl bg-primary-container text-on-primary-container text-label-lg hover:bg-inverse-primary hover:text-on-primary-fixed-variant transition-all shadow-sm whitespace-nowrap"
              >
                Create Account
              </Link>
              <button
                type="button"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="lg:hidden w-10 h-10 rounded-xl bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-container-high transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[22px]">{menuOpen ? 'close' : 'menu'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {menuOpen && (
        <div className="lg:hidden border-t border-surface-container-high bg-surface/95 backdrop-blur-xl">
          <nav className="w-full max-w-[1280px] mx-auto px-margin py-space-sm flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`px-space-md py-3 rounded-xl text-label-lg transition-colors ${
                    active ? 'bg-surface-container-high text-on-surface font-bold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {loggedIn ? (
              <div className="flex sm:hidden gap-space-sm pt-space-xs">
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-space-md py-3 rounded-xl bg-surface-container-high text-on-surface text-label-lg font-bold">
                  My Account
                </Link>
                <button
                  type="button"
                  onClick={() => setSignOutOpen(true)}
                  className="flex-1 px-space-md py-3 rounded-xl bg-surface-container-low text-on-surface text-label-lg"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="sm:hidden px-space-md py-3 rounded-xl text-label-lg text-center text-on-surface bg-surface-container-low">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
      <SignOutModal
        open={signOutOpen}
        onConfirm={confirmSignOut}
        onClose={() => setSignOutOpen(false)}
        name={user?.fullname}
      />
    </header>
  );
}
