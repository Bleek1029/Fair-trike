import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiUpdateProfile, apiRemovePicture } from '../api.js';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { SignOutModal } from '../components/SignOutModal.jsx';
import { initialsOf, avatarUrl } from '../lib/utils.js';

// ── Commuter account page — separate tab from Home/History ──
export function AccountPage() {
  const { user, updateUser, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [name, setName] = useState(user?.fullname || '');
  // Keep the editable name in sync once the session finishes loading.
  React.useEffect(() => { setName(user?.fullname || ''); }, [user?.fullname]);
  const fileRef = React.useRef(null);
  const avatar = avatarUrl(user?.profilePicture);

  const saveProfile = async (formData) => {
    setSaving(true); setMessage(''); setError('');
    try {
      const data = await apiUpdateProfile(formData);
      updateUser(data.user || { fullname: formData.get('fullname') });
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('fullname', name);
    const file = fileRef.current?.files?.[0];
    if (file) fd.append('profile_picture', file);
    saveProfile(fd);
  };

  const removePicture = async () => {
    setSaving(true); setMessage(''); setError('');
    try {
      await apiRemovePicture();
      updateUser({ profilePicture: null });
      setMessage('Profile picture removed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md" style={{ paddingTop: '5rem', paddingBottom: '6rem' }}>
      <MobileHeader />
      <main className="max-w-[520px] mx-auto px-space-md py-space-lg flex flex-col gap-space-lg pb-28">
        {/* Profile identity */}
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex items-center gap-space-md">
          {avatar ? (
            <img alt="Profile" src={avatar} className="w-16 h-16 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary text-on-primary text-title-lg font-bold flex items-center justify-center shrink-0">
              {initialsOf(user?.fullname)}
            </div>
          )}
          <div className="min-w-0 grow">
            <h1 className="text-headline-sm font-bold truncate">{user?.fullname || 'Commuter'}</h1>
            <p className="text-body-sm text-on-surface-variant truncate">{user?.email}</p>
            <span className="inline-flex mt-1 px-space-sm py-0.5 rounded-full bg-tertiary-container/20 text-label-sm font-bold capitalize">{user?.role || 'passenger'}</span>
          </div>
        </section>

        {message && <p className="text-label-md text-on-tertiary-container bg-tertiary-container/20 rounded-lg p-2 flex items-center gap-1"><Icon name="check_circle" size={16} /> {message}</p>}
        {error && <p className="text-label-md text-error bg-error-container/40 rounded-lg p-2 flex items-center gap-1"><Icon name="error" size={16} /> {error}</p>}

        {/* Edit profile */}
        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm flex flex-col gap-space-sm">
          <h2 className="text-title-md font-bold flex items-center gap-space-sm"><Icon name="edit" size={18} /> Edit Profile</h2>
          <form className="flex flex-col gap-space-sm" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl bg-surface px-space-md text-body-md outline-none border border-surface-container-highest focus:border-primary"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">Profile picture</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="text-body-sm file:mr-2 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary-container"
              />
            </label>
            <div className="flex gap-space-sm">
              <button type="submit" disabled={saving} className="grow h-11 rounded-xl bg-primary text-on-primary text-label-lg font-bold disabled:opacity-50 active:scale-[0.98] transition-transform">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {avatar && (
                <button type="button" onClick={removePicture} disabled={saving} className="px-space-md h-11 rounded-xl bg-surface-container-high text-label-lg font-bold">
                  Remove Photo
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => setSignOutOpen(true)}
          className="h-12 rounded-xl bg-error-container/40 text-error text-label-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Icon name="logout" size={20} /> Sign Out
        </button>
      </main>
      <SignOutModal open={signOutOpen} onConfirm={() => { setSignOutOpen(false); logout(); }} onClose={() => setSignOutOpen(false)} name={user?.fullname} />
      <BottomNav />
    </div>
  );
}
