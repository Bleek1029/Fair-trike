import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiGetMyDriver, apiUpdateProfile, apiRemovePicture } from '../api.js';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { SignOutModal } from '../components/SignOutModal.jsx';
import { initialsOf, avatarUrl } from '../lib/utils.js';
import { isDriver } from '../lib/roles.js';
import { useNavigate } from 'react-router-dom';

// ── Driver account — separate tab from Duty console ──
export function DriverAccount() {
  const { user, logout } = useAuth();
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [profileFile, setProfileFile] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    apiGetMyDriver()
      .then((data) => { if (!cancelled) setDriver(data.driver); })
      .catch((err) => { setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (!cancelled) setUserAvatar(user?.profile_picture ?? null);
    return () => { cancelled = true; };
  }, [user]);

  const handleProfileChange = (e) => {
    setProfileFile(e.target.files?.[0] ?? null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileFile) return;
    setProfileBusy(true);
    const fd = new FormData();
    fd.append('fullname', user?.fullname || '');
    fd.append('profile_picture', profileFile);
    try {
      const res = await apiUpdateProfile(fd);
      setUserAvatar(res.user?.profilePicture ?? null);
      setProfileFile(null);
    } catch (err) {
      setError(err.message || 'Failed to upload profile picture.');
    } finally {
      setProfileBusy(false);
    }
  };

  const handleRemoveProfile = async () => {
    try {
      await apiRemovePicture();
      setUserAvatar(null);
    } catch (err) {
      setError(err.message || 'Failed to remove profile picture.');
    }
  };

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
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex flex-col items-center gap-space-md">
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 ${
                userAvatar ? 'border-primary' : 'border-primary/30'
              }`}
            >
              {userAvatar ? (
                <img
                  src={avatarUrl(userAvatar)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '';
                    setUserAvatar(null);
                  }}
                />
              ) : (
                <div className="w-full h-full bg-primary text-on-primary flex items-center justify-center">
                  <span className="text-title-lg font-bold">{initialsOf(user?.fullname)}</span>
                </div>
              )}
            </div>
            {!profileBusy && (
              <label className="absolute bottom-0 right-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary shadow-sm cursor-pointer hover:bg-primary/90 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileChange}
                  className="hidden"
                />
                <span className="text-[10px]">✎</span>
              </label>
            )}
          </div>
          {profileBusy && (
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
              <span className="text-body-sm">⟳</span>
            </div>
          )}
          <div className="min-w-0 grow">
            <h1 className="text-headline-sm font-bold truncate">{user?.fullname || 'Driver'}</h1>
            <p className="text-body-sm text-on-surface-variant truncate">{user?.email}</p>
            <span className="inline-flex mt-1 px-space-sm py-0.5 rounded-full bg-primary-container/30 text-label-sm font-bold">Driver Partner</span>
          </div>
          {userAvatar && (
            <button
              type="button"
              onClick={handleRemoveProfile}
              className="text-body-xs text-error hover:text-error/80 underline underline-offset-2 mt-1"
            >
              Remove photo
            </button>
          )}
          {!userAvatar && profileFile && (
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={profileBusy}
              className={`text-body-xs font-bold px-2 py-1 rounded-md ${profileBusy ? 'bg-surface-container-high text-on-surface-variant opacity-60' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
            >
              {profileBusy ? 'Uploading…' : 'Save photo'}
            </button>
          )}
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
