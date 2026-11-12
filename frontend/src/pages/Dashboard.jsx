import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { initialsOf } from '../lib/utils.js';

// ── Commuter dashboard home — styled like HistoryPage / AccountPage ──
export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md" style={{ paddingTop: '5rem', paddingBottom: '6rem' }}>
      <MobileHeader />
      <main className="max-w-[520px] mx-auto px-space-md py-space-lg flex flex-col gap-space-lg pb-28">
        {/* Welcome hero */}
        <section className="flex flex-col items-start gap-1">
          <span className="text-label-md text-on-surface-variant uppercase tracking-wider font-bold">Dashboard</span>
          <h1 className="text-headline-sm font-bold leading-tight">
            Welcome back, {user?.fullname?.split(' ')[0] || 'Commuter'}!
          </h1>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Your trusted transportation partner in Olongapo City. Safe, reliable, and affordable rides at your fingertips.
          </p>
        </section>

        {/* Quick actions */}
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex flex-col gap-space-md">
          <h2 className="text-title-md font-bold flex items-center gap-space-sm">
            <Icon name="electric_rickshaw" size={18} /> Quick Actions
          </h2>
          <div className="flex flex-col gap-2">
            <Link
              to="/app"
              className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-lg font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
            >
              <Icon name="near_me" size={20} /> Book a Ride
            </Link>
            <button
              type="button"
              onClick={() => alert('Trip history coming soon!')}
              className="w-full h-12 rounded-xl bg-surface-container-high text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Icon name="receipt_long" size={20} /> View History
            </button>
          </div>
        </section>

        {/* Account snapshot */}
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex flex-col gap-space-md">
          <h2 className="text-title-md font-bold flex items-center gap-space-sm">
            <Icon name="person" size={18} /> Your Account
          </h2>
          <div className="border-t border-surface-container pt-space-md flex items-center justify-between gap-space-sm">
            <div className="min-w-0">
              <span className="text-body-sm text-on-surface-variant block">Full Name</span>
              <p className="text-label-md font-bold leading-tight truncate">{user?.fullname}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold">{initialsOf(user?.fullname)}</span>
            </div>
          </div>
          <div className="border-t border-surface-container pt-space-md flex items-center justify-between gap-space-sm">
            <div className="min-w-0">
              <span className="text-body-sm text-on-surface-variant block">Email Address</span>
              <p className="text-label-md font-bold leading-tight truncate">{user?.email}</p>
            </div>
          </div>
          <div className="border-t border-surface-container pt-space-md flex items-center justify-between gap-space-sm">
            <div className="min-w-0">
              <span className="text-body-sm text-on-surface-variant block">User ID</span>
              <p className="text-label-md font-bold leading-tight">{user?.id}</p>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}