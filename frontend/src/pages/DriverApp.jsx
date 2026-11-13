import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSearchParams } from 'react-router-dom';
import {
  apiGetMyDriver, apiGetAvailableRides, apiAcceptRide, apiCompleteRide,
  apiGetEarnings, apiGetDriverDocuments, apiUploadDriverDocument,
} from '../api.js';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { initialsOf, avatarUrl } from '../lib/utils.js';
import { fetchSteps, fmtStepDistance } from '../lib/navigation.js';
import { DriverMap } from '../app/DriverMap.jsx';
import {
  connectSocket, joinRide, leaveRide, joinDrivers, leaveDrivers,
  sendDriverLocation, onDriverLocation, onRideEvent, onRideRequested,
  disconnectSocket,
} from '../lib/socket.js';

const DOC_TYPES = [
  { value: 'license', label: "Driver's License" },
  { value: 'or_cr', label: 'OR / CR (Vehicle Registration)' },
  { value: 'nbi_clearance', label: 'NBI Clearance' },
  { value: 'toda_clearance', label: 'Association Clearance' },
];

// ── Driver console: a dedicated interface for drivers, fully separate
// from the commuter booking app (/app). Reached only when user.role === 'driver'.
export function DriverApp() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [driver, setDriver] = useState(null);
  const [driverLoading, setDriverLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [request, setRequest] = useState(null);
  const [accepted, setAccepted] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const [navSteps, setNavSteps] = useState(null);
  const [navLoading, setNavLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const socketRef = useRef(null);
  const watchRef = useRef(null);
  const activeRideId = useRef(null);
  const urlSyncRef = useRef(false); // Prevent circular updates

  // Documents
  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('license');
  const [docBusy, setDocBusy] = useState(false);
  const fileRef = useRef(null);

  const isApproved = driver?.status === 'approved';
  const fmtPeso = (n) => `₱${Number(n || 0).toFixed(2)}`;

  // Sync accepted ride to URL for deep linking
  const syncRideToUrl = useCallback((ride) => {
    if (ride) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('rideId', ride.id);
        if (ride.pickup) next.set('pickup', ride.pickup);
        if (ride.dropoff) next.set('dropoff', ride.dropoff);
        if (ride.status) next.set('status', ride.status);
        return next;
      }, { replace: true });
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('rideId');
        next.delete('pickup');
        next.delete('dropoff');
        next.delete('status');
        return next;
      }, { replace: true });
    }
  }, [setSearchParams]);

  const refreshEarnings = () => {
    apiGetEarnings()
      .then((data) => setEarnings(data))
      .catch((err) => setError(err.message));
  };

  // ── Live driver tracking ────────────────────────────────────────────────
  // While on an accepted trip, watches the driver's GPS position, updates the
  // local map state, and broadcasts the fix to the passenger via Socket.io.
  const startWatching = (rideId) => {
    if (!navigator.geolocation) return;
    stopWatching();
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setDriverPosition({ lat, lng });
        const s = socketRef.current;
        if (s) {
          joinRide(s, rideId);
          sendDriverLocation(s, rideId, lat, lng);
        }
      },
      (err) => console.warn('Geolocation watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  };

  const stopWatching = () => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setDriverPosition(null);
    const s = socketRef.current;
    const rideId = activeRideId.current;
    if (s && rideId) {
      leaveRide(s, rideId);
      activeRideId.current = null;
    }
  };

  // Load driver profile, documents and earnings on mount.
  useEffect(() => {
    let cancelled = false;

    // Connect Socket.io for real-time ride requests + live location push.
    const s = connectSocket();
    socketRef.current = s;
    joinDrivers(s);

    const unsubRequested = onRideRequested(s, (ride) => {
      // New ride pushed instantly (no need to wait up to 5s for the poll).
      if (!cancelled && online && !accepted && !request) setRequest(ride);
    });
    const unsubAccepted = onRideEvent(s, 'ride-accepted', (data) => {
      if (!cancelled && data?.ride) {
        setAccepted(data.ride);
        activeRideId.current = data.ride.id;
        startWatching(data.ride.id);
        syncRideToUrl(data.ride);
      }
    });
    const unsubCompleted = onRideEvent(s, 'ride-completed', (data) => {
      if (!cancelled && accepted && accepted.id === data.rideId) {
        setAccepted(null);
        syncRideToUrl(null);
        stopWatching();
      }
    });
    const unsubCancelled = onRideEvent(s, 'ride-cancelled', (data) => {
      if (!cancelled && accepted && accepted.id === data.rideId) {
        setAccepted(null);
        syncRideToUrl(null);
        stopWatching();
      }
    });

    apiGetMyDriver()
      .then((data) => { if (!cancelled) setDriver(data.driver); })
      .catch(() => { /* driver profile may not exist yet */ })
      .finally(() => { if (!cancelled) setDriverLoading(false); });
    apiGetDriverDocuments()
      .then((data) => { if (!cancelled) setDocuments(data.documents ?? []); })
      .catch(() => {});
    refreshEarnings();

    return () => {
      cancelled = true;
      unsubRequested();
      unsubAccepted();
      unsubCompleted();
      unsubCancelled();
      stopWatching();
      try { leaveDrivers(socketRef.current); } catch (_) {}
      disconnectSocket();
      socketRef.current = null;
    };
  }, []);

  // Restore ride state from URL on mount (deep linking)
  useEffect(() => {
    const urlRideId = searchParams.get('rideId');
    if (urlRideId && !accepted) {
      // Fetch ride details from backend
      fetch(`/api/rides/${urlRideId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.ride) {
            setAccepted(data.ride);
            activeRideId.current = data.ride.id;
            startWatching(data.ride.id);
            setStepIndex(0);
            setNavSteps(null);
            setNavLoading(true);
            fetchSteps(data.ride.pickupCoord, data.ride.dropoffCoord)
              .then(nav => { setNavSteps(nav); setNavLoading(false); })
              .catch(() => setNavLoading(false));
          }
        })
        .catch(() => {}); // Silently fail - ride may not exist or user not authorized
    }
  }, [searchParams]);

  // Poll for pending ride offers while on duty with no active trip.
  useEffect(() => {
    if (!online || accepted || !isApproved) { setRequest(null); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await apiGetAvailableRides();
        if (!cancelled) setRequest(data.rides?.[0] ?? null);
      } catch { /* transient network issue — retry next tick */ }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, [online, accepted, isApproved]);

  const handleAccept = async () => {
    if (!request) return;
    setError('');
    setBusy(true);
    try {
      const data = await apiAcceptRide(request.id);
      setAccepted(data.ride);
      syncRideToUrl(data.ride);
      setRequest(null);
      activeRideId.current = data.ride.id;
      startWatching(data.ride.id);
      setStepIndex(0);
      setNavSteps(null);
      setNavLoading(true);
      const nav = await fetchSteps(data.ride.pickupCoord, data.ride.dropoffCoord);
      setNavSteps(nav);
      setNavLoading(false);
    } catch (err) {
      setError(err.message);
      setRequest(null); // someone else took it — re-poll
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!accepted) return;
    setError('');
    setBusy(true);
    try {
      await apiCompleteRide(accepted.id);
      setAccepted(null);
      syncRideToUrl(null);
      stopWatching();
      setNavSteps(null);
      refreshEarnings();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Choose a document file first (image or PDF, max 5MB).');
    setError('');
    setDocBusy(true);
    try {
      const fd = new FormData();
      fd.append('doc_type', docType);
      fd.append('document', file);
      await apiUploadDriverDocument(fd);
      const data = await apiGetDriverDocuments();
      setDocuments(data.documents ?? []);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setDocBusy(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md" style={{ paddingTop: '5rem' }}>
      <MobileHeader />
      <main className="max-w-[520px] mx-auto px-space-md py-space-lg flex flex-col gap-space-lg pb-28">

        {error && (
          <div className="rounded-xl bg-error-container/50 text-error p-space-md text-body-sm flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="font-bold shrink-0 ml-2">✕</button>
          </div>
        )}

        {/* Driver identity + approval status */}
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex items-center gap-space-md">
          <div className="w-14 h-14 rounded-full bg-primary text-on-primary text-title-md font-bold flex items-center justify-center shrink-0">
            {initialsOf(user?.fullname)}
          </div>
          <div className="min-w-0 grow">
            <h2 className="text-headline-sm font-bold truncate">{user?.fullname || 'Driver'}</h2>
            {driverLoading ? (
              <p className="text-body-sm text-secondary">Loading driver profile…</p>
            ) : driver ? (
              <p className="text-body-sm text-secondary truncate">
                {driver.todaAssociation || 'Association unassigned'} · Trike #{driver.trikeNumber || '—'} · {driver.vehiclePlate || 'No plate'}
              </p>
            ) : (
              <p className="text-body-sm text-error">No driver profile found on record.</p>
            )}
          </div>
          <span className={`px-space-sm py-1 rounded-full text-label-sm font-bold flex items-center gap-1 shrink-0 ${
            isApproved ? 'bg-tertiary-container/30 text-on-tertiary-container' : 'bg-error-container/40 text-error'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-tertiary' : 'bg-error'}`} />
            {driverLoading ? '…' : isApproved ? 'Verified' : (driver?.status || 'Pending')}
          </span>
        </section>

        {/* Duty status toggle */}
        <section className={`rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm transition-colors ${
          online ? 'bg-primary-container/25' : 'bg-surface-container-low'
        }`}>
          <div className="flex items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${online ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                <Icon name={online ? 'wifi_tethering' : 'wifi_tethering_off'} size={22} />
              </div>
              <div>
                <h3 className="text-title-md font-bold">{online ? 'On Duty' : 'Off Duty'}</h3>
                <p className="text-body-sm text-on-surface-variant">
                  {isApproved
                    ? (online ? 'Receiving ride requests' : 'Go online to receive ride requests')
                    : 'Available once your verification is approved'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={online}
              disabled={!isApproved}
              onClick={() => {
                const goingOnline = !online;
                setOnline(goingOnline);
                if (!goingOnline) {
                  stopWatching();
                  try { leaveDrivers(socketRef.current); } catch (_) {}
                }
                setAccepted(null);
                setRequest(null);
              }}
              className={`w-14 h-8 rounded-full relative transition-colors shrink-0 ${online ? 'bg-primary' : 'bg-surface-container-highest'} ${!isApproved ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${online ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          {!isApproved && !driverLoading && (
            <p className="text-label-sm text-on-surface-variant bg-surface-container rounded-lg p-2">
              Your application is <strong>{driver?.status || 'pending'}</strong> verification. You will be able to accept trips once approved.
            </p>
          )}
        </section>

        {/* Incoming ride request — accept / reject */}
        {online && request && !accepted && (
          <section className="rounded-2xl bg-secondary-container/40 p-space-lg shadow-md flex flex-col gap-space-sm border border-secondary-container">
            <div className="flex items-center justify-between">
              <span className="text-label-md uppercase font-bold text-on-secondary-container tracking-wider">New Ride Request</span>
              <span className="text-label-sm text-on-surface-variant">#{request.id}</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-full bg-primary text-on-primary text-label-sm font-bold flex items-center justify-center shrink-0 overflow-hidden">
              {request.passengerAvatar ? (
                <img src={avatarUrl(request.passengerAvatar)} alt={request.passengerName || 'Passenger'} className="w-full h-full object-cover" />
              ) : (
                initialsOf(request.passengerName || 'P')
              )}
            </div>
              <div className="min-w-0">
                <p className="text-title-sm font-bold truncate">{request.passengerName || 'Commuter'}</p>
                <p className="text-body-sm text-on-surface-variant">{(request.distanceM / 1000).toFixed(1)} km · {request.pickup}</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
              <Icon name="arrow_forward" size={14} /> {request.dropoff}
            </p>
            <div className="flex gap-space-sm pt-1">
              <button
                type="button"
                onClick={() => setRequest(null)}
                className="grow h-11 rounded-xl bg-surface-container-high text-label-lg font-bold active:scale-[0.98] transition-transform"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={busy}
                className="grow h-11 rounded-xl bg-primary text-on-primary text-label-lg font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {busy ? 'Accepting…' : `Accept · ${fmtPeso(request.fare)}`}
              </button>
            </div>
          </section>
        )}

        {/* Active trip with turn-by-turn navigation */}
        {accepted && (
          <section className="rounded-2xl bg-primary-container/25 p-space-lg shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="text-label-md uppercase font-bold text-primary tracking-wider">Trip In Progress</span>
              <span className="text-label-sm text-on-surface-variant">#{accepted.id}</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary text-label-sm font-bold flex items-center justify-center shrink-0 overflow-hidden">
                {accepted.passengerAvatar ? (
                  <img src={avatarUrl(accepted.passengerAvatar)} alt={accepted.passengerName || 'Passenger'} className="w-full h-full object-cover" />
                ) : (
                  initialsOf(accepted.passengerName || 'P')
                )}
              </div>
              <div className="min-w-0">
                <p className="text-title-sm font-bold truncate">{accepted.passengerName || 'Commuter'}</p>
                <p className="text-body-sm text-on-surface-variant">Passenger · {(accepted.distanceM / 1000).toFixed(1)} km</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant">{accepted.pickup} → {accepted.dropoff}</p>

            {/* Live driver map — shows the passenger (pickup → dropoff) and the driver */}
            <DriverMap
              pickupCoord={accepted.pickupCoord}
              dropoffCoord={accepted.dropoffCoord}
              pickupLabel={accepted.pickup}
              dropoffLabel={accepted.dropoff}
              driverCoord={driverPosition}
            />

            {/* Turn-by-turn navigation */}
            <div className="rounded-xl bg-surface p-space-md flex flex-col gap-2">
              <div className="flex items-center gap-space-sm">
                <Icon name="navigation" size={18} />
                <h4 className="text-title-sm font-bold">Turn-by-Turn Navigation</h4>
              </div>
              {navLoading ? (
                <p className="text-body-sm text-on-surface-variant">Calculating route…</p>
              ) : navSteps ? (
                <>
                  <p className="text-body-sm text-on-surface-variant">
                    Total: {(navSteps.distance / 1000).toFixed(1)} km · {Math.round(navSteps.duration / 60)} mins
                  </p>
                  <div className="rounded-lg bg-primary-container/30 p-space-md">
                    <p className="text-label-sm text-on-surface-variant uppercase font-bold">Next</p>
                    <p className="text-title-md font-bold">
                      {navSteps.steps[stepIndex]?.instruction ?? 'Arrived'}
                    </p>
                    {navSteps.steps[stepIndex]?.road && (
                      <p className="text-body-sm text-on-surface-variant">onto {navSteps.steps[stepIndex].road}</p>
                    )}
                    {navSteps.steps[stepIndex] && stepIndex < navSteps.steps.length - 1 && (
                      <p className="text-label-sm text-on-surface-variant">
                        then {fmtStepDistance(navSteps.steps[stepIndex].distance)}
                      </p>
                    )}
                  </div>
                  <ol className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                    {navSteps.steps.map((s, i) => (
                      <li key={i} className={`text-body-sm flex items-center justify-between gap-2 rounded-lg px-2 py-1 ${i === stepIndex ? 'bg-primary-container/40 font-bold' : i < stepIndex ? 'text-on-surface-variant line-through' : ''}`}>
                        <span>{s.instruction}{s.road ? ` — ${s.road}` : ''}</span>
                        <span className="text-label-sm shrink-0">{fmtStepDistance(s.distance)}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex gap-space-sm">
                    <button
                      type="button"
                      onClick={() => setStepIndex((i) => Math.min(i + 1, navSteps.steps.length - 1))}
                      disabled={stepIndex >= navSteps.steps.length - 1}
                      className="grow h-10 rounded-xl bg-surface-container-high text-label-md font-bold disabled:opacity-50"
                    >
                      Next Step
                    </button>
                    <button
                      type="button"
                      onClick={() => setStepIndex(0)}
                      className="grow h-10 rounded-xl bg-surface-container text-label-md font-bold"
                    >
                      Restart
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-body-sm text-on-surface-variant">
                  Live routing unavailable — follow the labels: {accepted.pickup} → {accepted.dropoff}.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleComplete}
              disabled={busy}
              className="h-11 rounded-xl bg-primary text-on-primary text-label-lg font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {busy ? 'Completing…' : `Complete Trip · ${fmtPeso(accepted.fare)}`}
            </button>
            <p className="text-label-sm text-on-surface-variant">Completing credits the fare to your earnings report.</p>
          </section>
        )}

        {/* Today's summary (real earnings) */}
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm">
          <div className="flex items-center gap-space-sm pb-space-sm">
            <Icon name="insights" size={20} />
            <h3 className="text-title-md font-bold">Today's Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-space-sm">
            {[
              { icon: 'route', label: 'Trips today', value: String(earnings?.today?.trips ?? 0) },
              { icon: 'payments', label: 'Earnings today', value: fmtPeso(earnings?.today?.earnings) },
              { icon: 'calendar_month', label: 'This week', value: `${earnings?.week?.trips ?? 0} trips · ${fmtPeso(earnings?.week?.earnings)}` },
              { icon: 'military_tech', label: 'All time', value: `${earnings?.totals?.trips ?? 0} trips · ${fmtPeso(earnings?.totals?.earnings)}` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface p-space-md flex flex-col gap-0.5">
                <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name={s.icon} size={14} /> {s.label}</span>
                <span className="text-headline-sm font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Document upload */}
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <Icon name="folder_shared" size={20} />
            <h3 className="text-title-md font-bold">Documents</h3>
          </div>
          <p className="text-body-sm text-on-surface-variant">Upload your license, OR/CR, and clearances for verification.</p>

          <form className="flex flex-col gap-space-sm" onSubmit={handleUploadDocument}>
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant font-bold">Document type</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="h-11 rounded-xl bg-surface px-space-md text-body-md outline-none border border-surface-container-highest"
              >
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant font-bold">File (image or PDF · max 5MB)</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,application/pdf"
                className="h-11 rounded-xl bg-surface px-space-md text-body-sm"
              />
            </label>
            <button
              type="submit"
              disabled={docBusy}
              className="h-11 rounded-xl bg-primary text-on-primary text-label-lg font-bold disabled:opacity-60 flex items-center justify-center gap-1"
            >
              <Icon name="upload" size={18} /> {docBusy ? 'Uploading…' : 'Upload Document'}
            </button>
          </form>

          <div className="flex flex-col gap-1.5 pt-1">
            {documents.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No documents uploaded yet.</p>
            ) : (
              documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl bg-surface p-space-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name={d.docType === 'license' ? 'badge' : 'description'} size={18} />
                    <span className="text-label-lg truncate">
                      {DOC_TYPES.find((t) => t.value === d.docType)?.label ?? d.docType}
                    </span>
                  </div>
                  <span className={`text-label-sm font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    d.status === 'approved' ? 'bg-tertiary-container/30 text-on-tertiary-container'
                      : d.status === 'rejected' ? 'bg-error-container/40 text-error'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>



      </main>
      <BottomNav />
    </div>
  );
}

