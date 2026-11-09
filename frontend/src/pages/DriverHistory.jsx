import React, { useEffect, useState } from 'react';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { apiGetMyRides } from '../api.js';
import { avatarUrl } from '../lib/utils.js';

// ── Driver trip history — real completed rides ──
export function DriverHistory() {
  const [rides, setRides] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetMyRides()
      .then((data) => {
        setRides(data.rides ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const fmtPeso = (n) => `₱${Number(n || 0).toFixed(2)}`;

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
            <p className="text-body-sm text-on-surface-variant">Your completed driver trips.</p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm text-center">
            <p className="text-body-sm text-on-surface-variant">Loading trip history…</p>
          </div>
        ) : error && (
          <div className="rounded-xl bg-error-container/50 text-error p-space-md text-body-sm">{error}</div>
        )}

        <section className="flex flex-col gap-space-sm">
          {!rides || rides.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex flex-col items-center gap-2 text-center">
              <Icon name="receipt_long" size={32} />
              <p className="text-body-sm text-secondary">No trips yet. Your completed trips will appear here.</p>
            </div>
          ) : (
            rides.map((t) => (
              <article key={t.id} className="rounded-2xl bg-surface-container-low p-space-md shadow-sm flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-bold">#{t.id}</span>
                  <span className="px-space-sm py-0.5 rounded-full bg-tertiary-container/20 text-label-sm font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> {t.status}
                  </span>
                </div>
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary text-label-sm font-bold flex items-center justify-center shrink-0 overflow-hidden">
                    {t.passengerAvatar ? (
                      <img src={avatarUrl(t.passengerAvatar)} alt={t.passengerName || 'Passenger'} className="w-full h-full object-cover" />
                    ) : (
                      (t.passengerName || 'P').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                    )}
                  </div>
                  <p className="text-title-sm font-bold truncate">{t.passengerName || 'Commuter'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-on-surface-variant">{t.pickup} → {t.dropoff}</span>
                  <span className="text-title-md font-bold">{fmtPeso(t.fare)}</span>
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

