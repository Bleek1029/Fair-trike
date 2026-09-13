import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiRegisterDriver, apiLogin } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';

import { AuthSplit, ErrorAlert, SuccessAlert, TextField, PasswordField, passwordChecks, SubmitButton } from '../components/AuthSplit.jsx';

const PERKS = [
  { icon: 'verified', iconBg: 'bg-primary-container text-on-primary-container', title: 'Verified TODA Franchise', desc: 'Your franchise and trike body number get listed in the municipal directory.' },
  { icon: 'payments', iconBg: 'bg-tertiary-container text-on-tertiary-container', title: 'Fair Fixed-Zone Earnings', desc: 'No haggling, no commission cuts on regulated municipal tariffs.' },
  { icon: 'sos', iconBg: 'bg-secondary-fixed text-on-secondary-fixed', title: 'Driver SOS & Dispatch', desc: 'Direct line to the Barangay desk and 24/7 emergency dispatch.' },
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
      setSuccess(`${data.message || 'Driver account created!'} Redirecting...`);
      setTimeout(async () => {
        try {
          const res = await apiLogin({ email, password });
          if (res.token) { login(res.token, res.user); navigate('/app'); return; }
        } catch { /* fall through */ }
        navigate('/login');
      }, 1400);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return (
    <AuthSplit
      heroEyebrow="Driver Onboarding"
      heroTitle="Drive with Fairtrike."
      heroSubtitle="Join Olongapo’s verified TODA network. Fixed-zone fares, transparent receipts, and steady daily trips."
      perks={PERKS}
      quote="“Steady trips from Gordon Heights to SM Central, and fares are always clear.”"
      formBadge="Driver Application — 2 Minutes"
      formTitle="Driver Registration"
      formSubtitle="Register your franchise and trike to start accepting regulated municipal trips."
      bottom={(
        <div className="pt-0.5 text-center space-y-1">
          <p className="text-[12px] leading-5 text-secondary">
            Passenger instead?
            <Link className="text-[13px] text-primary font-bold underline ml-1" to="/register">Create commuter account</Link>
          </p>
          <p className="text-[12px] leading-5 text-secondary">
            Already have an account?
            <Link className="text-[13px] text-primary hover:text-on-primary-container font-bold underline ml-1" to="/login">Sign In</Link>
          </p>
        </div>
      )}
    >
      <ErrorAlert message={error} onClose={() => setError('')} />
      <SuccessAlert title="Application received!" message={success} />
      <form className="flex flex-col gap-1.5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          <TextField id="dFullName" label="Full Name" icon="person" type="text" value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder="Juan Dela Cruz" required valid={fullname.trim().length >= 3} />
          <TextField id="dContact" label="Contact Number" icon="call" type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="09xx xxx xxxx" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          <TextField id="dEmail" label="Email Address" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="driver@mail.com" required valid={emailOk} />
          <TextField id="dLicense" label="License No. *" icon="badge" type="text" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="N04-12-345678" required valid={license.trim().length >= 4} />
        </div>
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          <TextField id="dToda" label="TODA Association" icon="groups" type="text" value={toda} onChange={(e) => setToda(e.target.value)} placeholder="Yellow Line TODA" />
          <TextField id="dTrike" label="Trike Body No." icon="electric_rickshaw" type="text" value={trike} onChange={(e) => setTrike(e.target.value)} placeholder="#241" />
        </div>
        <TextField id="dPlate" label="Plate No." icon="pin" type="text" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC-1234" hint="New applications start as pending until the TODA desk verifies your franchise." />
        <div className="pt-0.5">
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input className="peer sr-only" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
              <div className={`w-5 h-5 rounded transition-all flex items-center justify-center ${agree ? 'bg-on-background border border-on-background' : 'bg-white border-2 border-[#8fa3c4]'}`}>
                <span className={`material-symbols-outlined text-white text-base font-bold ${agree ? 'opacity-100' : 'opacity-0'}`}>check</span>
              </div>
            </div>
            <span className="text-[12px] leading-5 font-semibold text-[#42506b] leading-snug">I accept the <span className="font-bold text-on-surface underline">Driver Franchise Terms</span> and TODA verification.</span>
          </label>
        </div>
        <SubmitButton loading={loading} loadingText="Registering Driver...">Register as Driver</SubmitButton>
      </form>
    </AuthSplit>
  );
}