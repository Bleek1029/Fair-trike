import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiGetRideHistory } from '../api.js';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { formatPeso } from '../lib/format.js';

// ── Commuter ride history — separate tab from Home/Account ──
export function HistoryPage() {
  const { user } = useAuth();
  const [rides, setRides] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetRideHistory()
      .then((d) => {
        setRides(d.rides ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md" style={{ paddingTop: '5rem', paddingBottom: '6rem' }}>
      <MobileHeader />
      <main className="max-w-[520px] mx-auto px-space-md py-space-lg flex flex-col gap-space-lg pb-28">
        <section className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <Icon name="receipt_long" size={22} />
          </div>
          <div>
            <h1 className="text-headline-sm font-bold">Trip History</h1>
            <p className="text-body-sm text-on-surface-variant">Your completed commutes, {user?.fullname?.split(' ')[0] || 'commuter'}.</p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm text-center">
            <p className="text-body-sm text-on-surface-variant">Loading your trips…</p>
          </div>
        ) : error && <div className="rounded-xl bg-error-container/50 text-error p-space-md text-body-sm">{error}</div>}

        <section className="flex flex-col gap-space-sm">
          {rides === null ? (
            <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm text-center">
              <p className="text-body-sm text-secondary">No trips yet. Book a ride from the Book tab — it will show up here.</p>
            </div>
          ) : rides.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex flex-col items-center gap-2 text-center">
              <Icon name="receipt_long" size={32} />
              <p className="text-body-sm text-secondary">No trips yet. Book a ride from the Book tab — it will show up here.</p>
            </div>
          ) : (
            rides.map((t) => (
              <article key={t.id} className="rounded-2xl bg-surface-container-low p-space-md shadow-sm flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-bold">Trip #{t.id}</span>
                  <span className="px-space-sm py-0.5 rounded-full bg-tertiary-container/20 text-label-sm font-bold capitalize">{t.status}</span>
                </div>
                <p className="text-body-sm text-on-surface-variant truncate">{t.pickup} → {t.dropoff}</p>
                <div className="flex items-center justify-between">
                  <span className="text-label-sm text-secondary">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}</span>
                  <span className="text-title-md font-bold">{formatPeso(t.fare)}</span>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
