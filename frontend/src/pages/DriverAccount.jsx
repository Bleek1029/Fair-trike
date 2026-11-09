import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiGetMyDriver } from '../api.js';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { SignOutModal } from '../components/SignOutModal.jsx';
import { initialsOf } from '../lib/utils.js';
import { isDriver } from '../lib/roles.js';
import { useNavigate } from 'react-router-dom';

// ── Driver account — separate tab from Duty console ──
export function DriverAccount() {
  const { user, logout } = useAuth();
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const signOutOpen = useState(false)[1];
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    apiGetMyDriver()
      .then((data) => { if (!cancelled) setDriver(data.driver); })
      .catch((err) => { setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = [
    { icon: 'badge', label: 'License No.', value: driver?.licenseNumber || '—' },
    { icon: 'groups', label: 'Association', value: driver?.todaAssociation || '—' },
    { icon: 'electric_rickshaw', label: 'Trike Number', value: driver?.trikeNumber ? `#${driver.trikeNumber}` : '—' },
    { icon: 'pin', label: 'Vehicle Plate', value: driver?.vehiclePlate || '—' },
    { icon: 'call', label: 'Contact Number', value: driver?.contactNumber || '—' },
    { icon: 'verified', label: 'Verification Status', value: driver?.status || '—' },
  ];

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md" style={{ paddingTop: '5rem', paddingBottom: '6rem' }}>
      <MobileHeader />
      <main className="max-w-[520px] mx-auto px-space-md py-space-lg flex flex-col gap-space-lg pb-28">
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex items-center gap-space-md">
          <div className="w-16 h-16 rounded-full bg-primary text-on-primary text-title-lg font-bold flex items-center justify-center shrink-0">
            {initialsOf(user?.fullname)}
          </div>
          <div className="min-w-0 grow">
            <h1 className="text-headline-sm font-bold truncate">{user?.fullname || 'Driver'}</h1>
            <p className="text-body-sm text-on-surface-variant truncate">{user?.email}</p>
            <span className="inline-flex mt-1 px-space-sm py-0.5 rounded-full bg-primary-container/30 text-label-sm font-bold">Driver Partner</span>
          </div>
        </section>

        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm">
          <h2 className="text-title-md font-bold flex items-center gap-space-sm pb-space-sm"><Icon name="license" size={18} /> Franchise Details</h2>
          <div className="flex flex-col divide-y divide-surface-container-highest">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-space-sm gap-space-md">
                <span className="flex items-center gap-1.5 text-label-md text-on-surface-variant shrink-0"><Icon name={r.icon} size={16} /> {r.label}</span>
                <span className="text-body-sm font-semibold text-right truncate capitalize">{r.value}</span>
              </div>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm text-center">
            <p className="text-body-sm text-on-surface-variant">Loading driver profile…</p>
          </div>
        ) : error && (
          <div className="rounded-xl bg-error-container/50 text-error p-space-md text-body-sm">{error}</div>
        )}

        <button
          type="button"
          onClick={() => setSignOutOpen(true)}
          className="h-12 rounded-xl bg-error-container/40 text-error text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Icon name="logout" size={20} /> Sign Out
        </button>
      </main>
      <SignOutModal open={signOutOpen} onConfirm={() => { setSignOutOpen(false); const target = isDriver(user) ? '/login-driver' : '/login'; logout(); navigate(target); }} onClose={() => setSignOutOpen(false)} name={user?.fullname} />
      <BottomNav />
    </div>
  );
}
