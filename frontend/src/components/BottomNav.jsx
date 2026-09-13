import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// ── Mobile bottom tab bar (app-style navigation, phones only) ──
const TABS = [
  { label: 'Home', to: '/dashboard', icon: 'electric_rickshaw' },
  { label: 'Book', to: '/app', icon: 'near_me' },
  { label: 'Drivers', to: '/driver-info', icon: 'two_wheeler' },
  { label: 'History', to: '/dashboard', icon: 'receipt_long' },
  { label: 'Account', to: '/dashboard', icon: 'person' },
];

export function BottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return null;
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
        display: 'flex', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around',
        gap: 0, minHeight: 64, padding: '8px 4px calc(8px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(250, 248, 255, 0.97)', borderTop: '1px solid #dae2fd',
        boxShadow: '0 -2px 12px rgba(13, 92, 58, 0.08)',
      }}
      className="md:hidden"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link
            key={tab.label}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: '1 1 0', minWidth: 0, maxWidth: 96, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48,
              padding: '6px 2px 4px', borderRadius: 10, overflow: 'hidden', textDecoration: 'none',
              color: active ? '#0d5c3a' : '#404942', fontWeight: active ? 800 : 400,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "'Material Symbols Outlined'", fontSize: 24, lineHeight: '24px',
                width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 400,
              }}
            >
              {tab.icon}
            </span>
            <span style={{ fontSize: 10, lineHeight: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}