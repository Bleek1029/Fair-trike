import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiRegisterDriver, apiLoginDriver } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';

import { AuthSplit, ErrorAlert, SuccessAlert, TextField, PasswordField, passwordChecks, SubmitButton } from '../components/AuthSplit.jsx';

const PERKS = [
  { icon: 'verified', iconBg: 'bg-primary-container text-on-primary-container', title: 'Driver directory', desc: 'Your franchise details get listed in the driver directory.' },
  { icon: 'payments', iconBg: 'bg-tertiary-container text-on-tertiary-container', title: 'Trip earnings', desc: 'Fares are computed from the route distance.' },
];

export function DriverRegister() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [fullname, setFullname] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [license, setLicense] = useState('');
  const [toda, setToda] = useState('');
  const [trike, setTrike] = useState('');
  const [plate, setPlate] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const { hasMinLength, hasUppercase, hasNumber } = passwordChecks(password);
    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setError('Password must meet all 3 safety criteria: 6+ characters, uppercase letter, and a number.');
      return;
    }
    if (!agree) { setError('Please accept the Driver Franchise Terms.'); return; }
    setLoading(true);
    try {
      const data = await withPageLoading(showLoading, hideLoading, 'Registering your driver franchise...', () =>
        apiRegisterDriver({ fullname, email, password, license_number: license, toda_association: toda, trike_number: trike, vehicle_plate: plate, contact_number: contact })
      );
      setSuccess(data.message || 'Driver account created! Your application is pending admin approval. You will be able to sign in once approved.');
      setTimeout(() => navigate('/login-driver'), 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return (
    <AuthSplit
      heroEyebrow="Driver Onboarding"
      heroTitle="Drive with Fairtrike."
      heroSubtitle="Join the driver network and start receiving ride requests."
      perks={PERKS}
      quote="“Trips are always recorded and easy to track.”"
      formBadge="Driver Application"
      formTitle="Driver Registration"
      formSubtitle="Register your franchise and trike to start accepting trips."
      bottom={(
        <div className="pt-0.5 text-center space-y-1">
          <p className="text-[12px] leading-5 text-secondary">
            Passenger instead?
            <Link className="text-[13px] text-primary font-bold underline ml-1" to="/register">Create commuter account</Link>
          </p>
          <p className="text-[12px] leading-5 text-secondary">
            Already have an account?
            <Link className="text-[13px] text-primary hover:text-on-primary-container font-bold underline ml-1" to="/login-driver">Sign In</Link>
          </p>
        </div>
      )}
    >
      <ErrorAlert message={error} onClose={() => setError('')} />
      <SuccessAlert title="Application received!" message={success} />
      <form className="flex flex-col gap-1.5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          <TextField id="dFullName" label="Full Name" icon="person" type="text" value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder="Full name" required valid={fullname.trim().length >= 3} />
          <TextField id="dContact" label="Contact Number" icon="call" type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact number" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          <TextField id="dEmail" label="Email Address" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required valid={emailOk} />
          <TextField id="dLicense" label="License No. *" icon="badge" type="text" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="License number" required valid={license.trim().length >= 4} />
        </div>
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          <TextField id="dToda" label="Association" icon="groups" type="text" value={toda} onChange={(e) => setToda(e.target.value)} placeholder="Association name" />
          <TextField id="dTrike" label="Trike Body No." icon="electric_rickshaw" type="text" value={trike} onChange={(e) => setTrike(e.target.value)} placeholder="Trike number" />
        </div>
        <TextField id="dPlate" label="Plate No." icon="pin" type="text" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Plate number" hint="New applications start as pending until verified." />
        <div className="pt-0.5">
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input className="peer sr-only" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
              <div className={`w-5 h-5 rounded transition-all flex items-center justify-center ${agree ? 'bg-on-background border border-on-background' : 'bg-white border-2 border-[#8fa3c4]'}`}>
                <span className={`material-symbols-outlined text-white text-base font-bold ${agree ? 'opacity-100' : 'opacity-0'}`}>check</span>
              </div>
            </div>
            <span className="text-[12px] leading-5 font-semibold text-[#42506b] leading-snug">I accept the <span className="font-bold text-on-surface underline">Driver Franchise Terms</span> and driver verification.</span>
          </label>
        </div>
        <SubmitButton loading={loading} loadingText="Registering Driver...">Register as Driver</SubmitButton>
      </form>
    </AuthSplit>
  );
}