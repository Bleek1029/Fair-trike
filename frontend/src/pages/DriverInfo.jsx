import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Chrome.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Footer } from '../components/Footer.jsx';
import { Icon } from '../components/Icon.jsx';
import { TariffSheet } from '../components/TariffSheet.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiListDrivers, apiGetMyDriver, apiUpdateMyDriver } from '../api.js';
import { initialsOf, avatarUrl } from '../lib/utils.js';

const FILTERS = [
  { label: 'All', value: 'all', icon: 'tune' },
];

function areaOf(d) {
  return `${d.todaAssociation || ''} ${d.trikeNumber || ''} ${d.fullname || ''} ${d.licenseNumber || ''}`.toLowerCase();
}

export function DriverInfo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDriver = user?.role === 'driver';
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mine, setMine] = useState(null);
  const [edit, setEdit] = useState({ toda_association: '', trike_number: '', vehicle_plate: '', contact_number: '' });
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sheetDriver, setSheetDriver] = useState(null);

  useEffect(() => {
    apiListDrivers(true)
      .then((d) => setDrivers(d.drivers || []))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isDriver) return;
    apiGetMyDriver()
      .then((d) => {
        setMine(d.driver);
        setEdit({
          toda_association: d.driver?.todaAssociation || '',
          trike_number: d.driver?.trikeNumber || '',
          vehicle_plate: d.driver?.vehiclePlate || '',
          contact_number: d.driver?.contactNumber || '',
        });
      })
      .catch(() => { /* no profile yet */ });
  }, [isDriver]);

  const saveMine = async (e) => {
    e.preventDefault();
    setSaveMsg(''); setSaving(true);
    try {
      const d = await apiUpdateMyDriver(edit);
      setMine(d.driver); setSaveMsg(d.message || 'Saved.');
    } catch (err) { setSaveMsg(err.message); }
    finally { setSaving(false); }
  };

  const visibleDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((d) => {
      const hay = areaOf(d);
      const matchesFilter = filter === 'all' || hay.includes(filter);
      const matchesQuery = !q || hay.includes(q) || String(d.licenseNumber || '').toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [drivers, query, filter]);

  const openSheet = (d) => setSheetDriver({
    name: d.fullname,
    toda: d.todaAssociation || '—',
    terminal: d.todaAssociation || '—',
    franchise: d.licenseNumber || '—',
    trike: d.trikeNumber ? `#${d.trikeNumber}` : '—',
    plate: d.vehiclePlate || '—',
  });

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md pb-24" style={{ paddingTop: '5rem' }}>
      <Header />
      <main className="w-full bg-surface">
        <div className="w-full max-w-[1280px] mx-auto px-margin lg:px-margin-desktop py-space-lg flex flex-col gap-space-xl">
          {/* HERO */}
          <div className="relative overflow-hidden bg-surface-container-low rounded-2xl p-space-lg lg:p-space-xl shadow-sm">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">
              <div className="flex flex-col gap-space-xs">
                <h1 className="text-display tracking-tight text-on-surface">Driver Hub</h1>
                <p className="text-body-md text-on-surface-variant max-w-2xl">
                  Drivers listed here come from the live directory below.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-space-sm">
                <Link to="/register-driver" className="px-space-lg py-3 rounded-xl bg-primary-container text-on-primary-container text-label-lg font-bold shadow-sm text-center">
                  Register as Driver
                </Link>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            <div className="lg:col-span-4 flex flex-col gap-space-lg">
              {isDriver ? (
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm">
                  <span className="text-label-sm uppercase tracking-wider text-secondary font-bold">My Driver Profile</span>
                  {mine ? (
                    <div className="flex flex-col gap-space-xs text-body-md">
                      <div className="flex items-center gap-1 text-tertiary text-label-md font-bold">
                        <span className="w-2 h-2 rounded-full bg-tertiary" /> Status: {String(mine.status).toUpperCase()}
                      </div>
                      <div>License: <strong>{mine.licenseNumber}</strong></div>
                      <div>Association: {mine.todaAssociation || '—'}</div>
                      <div>Trike: {mine.trikeNumber || '—'} / Plate: {mine.vehiclePlate || '—'}</div>
                      <div>Contact: {mine.contactNumber || '—'}</div>
                    </div>
                  ) : (<p className="text-body-sm text-secondary">No driver profile found.</p>)}
                  <form className="flex flex-col gap-space-sm" onSubmit={saveMine}>
                    <input value={edit.toda_association} onChange={(e) => setEdit({ ...edit, toda_association: e.target.value })} placeholder="Association" className="h-[44px] px-4 rounded-xl bg-surface-container-low text-body-md" />
                    <input value={edit.trike_number} onChange={(e) => setEdit({ ...edit, trike_number: e.target.value })} placeholder="Trike Body No." className="h-[44px] px-4 rounded-xl bg-surface-container-low text-body-md" />
                    <input value={edit.vehicle_plate} onChange={(e) => setEdit({ ...edit, vehicle_plate: e.target.value })} placeholder="Plate No." className="h-[44px] px-4 rounded-xl bg-surface-container-low text-body-md" />
                    <input value={edit.contact_number} onChange={(e) => setEdit({ ...edit, contact_number: e.target.value })} placeholder="Contact No." className="h-[44px] px-4 rounded-xl bg-surface-container-low text-body-md" />
                    {saveMsg && <div className="rounded-xl bg-surface-container-low p-3 text-body-sm">{saveMsg}</div>}
                    <button disabled={saving} className="h-[44px] rounded-xl bg-primary-container text-on-primary-container text-label-lg font-bold">{saving ? 'Saving…' : 'Save Details'}</button>
                  </form>
                </div>
              ) : (
                <div className="bg-inverse-surface text-inverse-on-surface rounded-2xl p-space-lg shadow-md flex flex-col gap-space-sm">
                  <h2 className="text-headline-md">Drive with Fairtrike</h2>
                  <p className="text-body-sm text-secondary-fixed-dim">Drivers get listed here after registration.</p>
                  <Link to="/register-driver" className="h-[48px] rounded-xl bg-primary-container text-on-primary-container text-label-lg font-bold flex items-center justify-center">Become a Driver</Link>
                  <span className="text-body-sm">Already a driver? <Link to="/login" className="font-bold underline">Sign In</Link></span>
                </div>
              )}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm">
                <span className="text-label-sm uppercase tracking-wider text-secondary font-bold">How it works</span>
                <div className="text-body-sm text-on-surface-variant flex flex-col gap-2">
                  <div className="flex gap-2"><Icon name="app_registration" size={18} /><span>1. Register with license details.</span></div>
                  <div className="flex gap-2"><Icon name="fact_check" size={18} /><span>2. Application is reviewed.</span></div>
                  <div className="flex gap-2"><Icon name="verified" size={18} /><span>3. Listed drivers appear in the directory.</span></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md text-on-surface">Drivers</h2>
                <span className="text-label-sm text-secondary">{visibleDrivers.length} listed</span>
              </div>
              <div className="relative flex items-center w-full">
                <span className="absolute left-3.5 text-outline"><Icon name="search" size={20} /></span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search driver, association, or trike #..."
                  type="search"
                  className="w-full h-12 pl-10 pr-10 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline text-body-md focus:outline-none shadow-sm"
                />
                {query && (
                  <button type="button" aria-label="Clear Search" onClick={() => setQuery('')} className="absolute right-3 w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
              {loading && <p className="text-body-sm text-secondary">Loading drivers…</p>}
              {loadError && <div className="rounded-xl bg-error-container text-on-error-container p-3 text-body-sm">{loadError}</div>}
              {!loading && !loadError && visibleDrivers.length === 0 && (
                <div className="flex flex-col items-center justify-center p-space-xl text-center rounded-xl bg-surface-container-low">
                  <Icon name="minor_crash" size={48} className="text-outline mb-space-xs" />
                  <h3 className="text-headline-sm text-on-surface font-bold">No Matching Operators</h3>
                  <p className="text-body-sm text-on-surface-variant max-w-[240px] mt-1">
                    We couldn&apos;t find any driver matching your query. Check the body number or try another association.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setFilter('all'); }}
                    className="mt-space-md px-4 py-2 rounded-lg bg-primary-fixed text-on-primary-fixed text-label-md font-bold"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {visibleDrivers.map((d) => (
                  <div key={d.id} className="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-label-md font-bold">
                        {d.profilePicture ? (
                          <img src={avatarUrl(d.profilePicture)} alt={d.fullname} className="w-10 h-10 rounded-full object-cover" />
                        ) : initialsOf(d.fullname)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-label-lg font-bold truncate">{d.fullname}</span>
                        <span className="text-body-sm text-secondary truncate">{d.todaAssociation || '—'}</span>
                      </div>
                    </div>
                    <div className="text-body-sm text-on-surface-variant">
                      <div>Trike {d.trikeNumber || '—'} / Plate {d.vehiclePlate || '—'}</div>
                      <div>License {d.licenseNumber}</div>
                      {d.contactNumber && <div>Contact: {d.contactNumber}</div>}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-label-sm font-bold w-fit">
                        {d.status || 'listed'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openSheet(d)}
                        className="inline-flex items-center gap-1 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary-container transition-colors shadow-sm"
                      >
                        <span>View Tariff</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <TariffSheet
        open={Boolean(sheetDriver)}
        driver={sheetDriver}
        onClose={() => setSheetDriver(null)}
        onBook={() => { setSheetDriver(null); navigate('/app'); }}
      />
      <BottomNav />
      <Footer />
    </div>
  );
}
