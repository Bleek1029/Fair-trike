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
  { label: 'All Lines', value: 'all', icon: 'tune' },
  { label: 'East Bajac-Bajac', value: 'east bajac-bajac' },
  { label: 'Gordon Heights', value: 'gordon heights' },
  { label: 'Subic Bay Gate', value: 'subic' },
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
    toda: d.todaAssociation || 'Independent TODA',
    terminal: d.todaAssociation ? `${d.todaAssociation} Terminal` : 'Olongapo City Terminal',
    franchise: d.licenseNumber || 'N/A',
    trike: d.trikeNumber ? `#${d.trikeNumber}` : '—',
    plate: d.vehiclePlate || '—',
    rating: '4.9',
  });

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md pb-24" style={{ paddingTop: '5rem' }}>
      <Header />
      <main className="w-full bg-surface">
        <div className="w-full max-w-[1280px] mx-auto px-margin lg:px-margin-desktop py-space-lg flex flex-col gap-space-xl">
          {/* HERO */}
          <div className="relative overflow-hidden bg-surface-container-low rounded-2xl p-space-lg lg:p-space-xl shadow-sm">
            <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-container/15 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">
              <div className="flex flex-col gap-space-xs">
                <span className="px-space-sm py-0.5 rounded-full bg-tertiary-container/20 text-on-tertiary-container text-label-sm flex items-center gap-1 w-fit">
                  <Icon name="verified" size={14} /> Verified TODA Network
                </span>
                <h1 className="text-display tracking-tight text-on-surface">Driver &amp; TODA Hub</h1>
                <p className="text-body-md text-on-surface-variant max-w-2xl">
                  Meet Olongapo City&apos;s accredited tricycle drivers. Every listed driver carries a verified franchise and fixed municipal tariff.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-space-sm">
                <Link to="/register-driver" className="px-space-lg py-3 rounded-xl bg-primary-container text-on-primary-container text-label-lg font-bold shadow-sm text-center">
                  Register as Driver
                </Link>
                <a href="tel:911" className="px-space-lg py-3 rounded-xl bg-surface-container-lowest text-on-surface text-label-lg font-bold shadow-sm text-center">
                  Barangay SOS (911)
                </a>
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
                      <div>TODA: {mine.todaAssociation || '—'}</div>
                      <div>Trike: {mine.trikeNumber || '—'} / Plate: {mine.vehiclePlate || '—'}</div>
                      <div>Contact: {mine.contactNumber || '—'}</div>
                    </div>
                  ) : (<p className="text-body-sm text-secondary">No driver profile found.</p>)}
                  <form className="flex flex-col gap-space-sm" onSubmit={saveMine}>
                    <input value={edit.toda_association} onChange={(e) => setEdit({ ...edit, toda_association: e.target.value })} placeholder="TODA Association" className="h-[44px] px-4 rounded-xl bg-surface-container-low text-body-md" />
                    <input value={edit.trike_number} onChange={(e) => setEdit({ ...edit, trike_number: e.target.value })} placeholder="Trike Body No." className="h-[44px] px-4 rounded-xl bg-surface-container-low text-body-md" />
                    <input value={edit.vehicle_plate} onChange={(e) => setEdit({ ...edit, vehicle_plate: e.target.value })} placeholder="Plate No." className="h-[44px] px-4 rounded-xl bg-surface-container-low text-body-md" />
                    <input value={edit.contact_number} onChange={(e) => setEdit({ ...edit, contact_number: e.target.value })} placeholder="Contact No." className="h-[44px] px-4 rounded-xl bg-surface-container-low text-body-md" />
                    {saveMsg && <div className="rounded-xl bg-surface-container-low p-3 text-body-sm">{saveMsg}</div>}
                    <button disabled={saving} className="h-[44px] rounded-xl bg-primary-container text-on-primary-container text-label-lg font-bold">{saving ? 'Saving…' : 'Save Details'}</button>
                  </form>
                </div>
              ) : (
                <div className="bg-inverse-surface text-inverse-on-surface rounded-2xl p-space-lg shadow-md flex flex-col gap-space-sm">
                  <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container"><Icon name="two_wheeler" size={22} /></div>
                  <h2 className="text-headline-md">Drive with Fairtrike</h2>
                  <p className="text-body-sm text-secondary-fixed-dim">Accredited drivers get listed here and receive fixed-tariff bookings.</p>
                  <Link to="/register-driver" className="h-[48px] rounded-xl bg-primary-container text-on-primary-container text-label-lg font-bold flex items-center justify-center">Become a Driver</Link>
                  <span className="text-body-sm">Already a driver? <Link to="/login" className="font-bold underline">Sign In</Link></span>
                </div>
              )}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm">
                <span className="text-label-sm uppercase tracking-wider text-secondary font-bold">How verification works</span>
                <div className="text-body-sm text-on-surface-variant flex flex-col gap-2">
                  <div className="flex gap-2"><Icon name="app_registration" size={18} /><span>1. Register with license + franchise details.</span></div>
                  <div className="flex gap-2"><Icon name="fact_check" size={18} /><span>2. TODA desk reviews (pending).</span></div>
                  <div className="flex gap-2"><Icon name="verified" size={18} /><span>3. Approved drivers appear in the directory.</span></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md text-on-surface">Verified Drivers</h2>
                <span className="text-label-sm text-secondary">{visibleDrivers.length} of {drivers.length} listed</span>
              </div>
              <div className="relative flex items-center w-full">
                <span className="absolute left-3.5 text-outline"><Icon name="search" size={20} /></span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search TODA line, terminal, or trike body #..."
                  type="search"
                  className="w-full h-12 pl-10 pr-10 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline text-body-md focus:outline-none shadow-sm"
                />
                {query && (
                  <button type="button" aria-label="Clear Search" onClick={() => setQuery('')} className="absolute right-3 w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-space-xs overflow-x-auto py-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter(f.value)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-label-md transition-all flex items-center gap-1.5 ${
                      filter === f.value ? 'bg-primary text-on-primary shadow-sm font-bold' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {f.icon && <Icon name={f.icon} size={16} />}
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-space-xs p-space-sm rounded-xl bg-surface-container-lowest shadow-sm">
                <div className="flex flex-col items-center text-center p-2 rounded-lg bg-surface-container-low/60">
                  <span className="text-headline-sm text-primary font-extrabold">1,420+</span>
                  <span className="text-label-sm text-on-surface-variant">Franchises</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 rounded-lg bg-surface-container-low/60">
                  <span className="text-headline-sm text-secondary font-extrabold">100%</span>
                  <span className="text-label-sm text-on-surface-variant">Regulated</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 rounded-lg bg-surface-container-low/60">
                  <span className="text-headline-sm text-primary-container font-extrabold">18</span>
                  <span className="text-label-sm text-on-surface-variant">Terminals</span>
                </div>
              </div>
              {loading && <p className="text-body-sm text-secondary">Loading drivers…</p>}
              {loadError && <div className="rounded-xl bg-error-container text-on-error-container p-3 text-body-sm">{loadError}</div>}
              {!loading && !loadError && visibleDrivers.length === 0 && (
                <div className="flex flex-col items-center justify-center p-space-xl text-center rounded-xl bg-surface-container-low">
                  <Icon name="minor_crash" size={48} className="text-outline mb-space-xs" />
                  <h3 className="text-headline-sm text-on-surface font-bold">No Matching Operators</h3>
                  <p className="text-body-sm text-on-surface-variant max-w-[240px] mt-1">
                    We couldn&apos;t find any accredited trike matching your query. Check the body number or try another TODA line.
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
                        <span className="text-body-sm text-secondary truncate">{d.todaAssociation || 'Independent TODA'}</span>
                      </div>
                    </div>
                    <div className="text-body-sm text-on-surface-variant">
                      <div>Trike {d.trikeNumber || '—'} / Plate {d.vehiclePlate || '—'}</div>
                      <div>License {d.licenseNumber}</div>
                      {d.contactNumber && <div>Contact: {d.contactNumber}</div>}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-container/20 text-label-sm font-bold w-fit flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Verified
                      </span>
                      <button
                        type="button"
                        onClick={() => openSheet(d)}
                        className="inline-flex items-center gap-1 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary-container transition-colors shadow-sm"
                      >
                        <span>View Tariff</span>
                        <Icon name="chevron_right" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-space-sm">
            <a href="tel:911" className="flex items-center gap-3 p-space-sm rounded-xl bg-error-container text-on-error-container shadow-sm hover:brightness-95 active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-full bg-error text-on-error flex items-center justify-center flex-shrink-0">
                <Icon name="call" size={22} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-sm font-bold uppercase tracking-wider text-error">Emergency</span>
                <span className="text-headline-md font-extrabold leading-none">911 SOS</span>
              </div>
            </a>
            <a href="tel:911" className="flex items-center gap-3 p-space-sm rounded-xl bg-surface-container-high text-on-surface shadow-sm active:scale-95 transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center flex-shrink-0">
                <Icon name="policy" size={22} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">TMB Hotline</span>
                <span className="text-headline-sm text-on-surface font-bold leading-none truncate">Helpdesk</span>
              </div>
            </a>
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
