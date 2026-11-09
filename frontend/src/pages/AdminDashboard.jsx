// Admin console — stats + driver verification + ride audit.
import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiAdminStats, apiAdminDrivers } from '../api.js';
import { apiSetDriverStatus, apiAdminRides } from '../api.js';
import { Header } from '../components/Chrome.jsx';
import { Footer } from '../components/Footer.jsx';
import { Icon } from '../components/Icon.jsx';

export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setError('');
    try {
      const s = await apiAdminStats();
      const d = await apiAdminDrivers();
      const r = await apiAdminRides();
      setStats(s);
      setDrivers(d.drivers || []);
      setRides(r.rides || []);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);
  const approve = async (uid, status) => {
    setBusy(uid);
    try { await apiSetDriverStatus(uid, status); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };
  const total = (o) => Object.values(o || {}).reduce((a, n) => a + Number(n || 0), 0);
  return (
    <div className="w-full min-h-screen bg-surface text-on-surface" style={{ paddingTop: '5rem' }}>
      <Header />
      <main className="w-full max-w-[1280px] mx-auto px-margin py-space-lg flex flex-col gap-space-lg">
        <section className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center"><Icon name="shield_person" size={22} /></div>
          <div>
            <h1 className="text-headline-sm font-bold">Admin Console</h1>
            <p className="text-body-sm text-on-surface-variant">Signed in as {user?.fullname || user?.email}.</p>
          </div>
          <button type="button" onClick={load} className="ml-auto px-4 h-10 rounded-xl bg-surface-container-low font-bold">Refresh</button>
        </section>
        {error && <div className="rounded-xl bg-error-container/50 text-error p-3 text-body-sm">{error}</div>}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
          {[['Users', total(stats?.users)], ['Drivers', total(stats?.drivers)], ['Rides', total(stats?.rides)], ['Pending docs', stats?.documents?.pending ?? 0]].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-surface-container-low p-4 shadow-sm"><p className="text-headline-sm font-bold">{v}</p><p className="text-label-sm text-secondary">{l}</p></div>
          ))}
        </section>
        <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
          <h2 className="text-title-md font-bold">Driver verification queue</h2>
          {drivers.length === 0 ? <p className="text-body-sm text-secondary">No driver applications yet.</p> : drivers.map((d) => (
            <div key={d.userId ?? d.id} className="flex items-center gap-2 py-2 border-t border-surface-container-high">
              <div className="grow min-w-0"><p className="font-bold truncate">{d.fullname} · {d.email}</p><p className="text-body-sm text-secondary truncate">{d.todaAssociation || 'No association'} · {d.status}</p></div>
              <button type="button" disabled={busy === d.userId} onClick={() => approve(d.userId, 'approved')} className="px-3 h-9 rounded-lg bg-primary text-on-primary font-bold">Approve</button>
              <button type="button" disabled={busy === d.userId} onClick={() => approve(d.userId, 'rejected')} className="px-3 h-9 rounded-lg bg-error-container/50 text-error font-bold">Reject</button>
            </div>
          ))}
        </section>
        <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm">
          <h2 className="text-title-md font-bold">Latest rides</h2>
          {rides.length === 0 ? <p className="text-body-sm text-secondary">No rides yet.</p> : rides.slice(0, 20).map((r) => (
            <div key={r.id} className="py-2 border-t border-surface-container-high text-body-sm"><span className="font-bold">#{r.id}</span> {r.pickup} → {r.dropoff} · ₱{Number(r.fare || 0).toFixed(2)} · {r.status}</div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}

