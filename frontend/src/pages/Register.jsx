import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiRegister } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, TextField, PasswordField, passwordChecks, TermsCheckbox, SubmitButton } from '../components/AuthSplit.jsx';

const PERKS = [
  { icon: 'percent', iconBg: 'bg-primary-container text-on-primary-container', title: '15% Off Your First 3 Trips', desc: 'Instant welcome credit applied to standard municipal zone fares automatically.' },
  { icon: 'receipt_long', iconBg: 'bg-tertiary-container text-on-tertiary-container', title: 'Automated Fare Receipts', desc: 'Clear breakdown of base flag-down, distance, and zero illegal surcharge protection.' },
  { icon: 'map', iconBg: 'bg-secondary-fixed text-on-secondary-fixed', title: 'Barangay Zone Terminal Telemetry', desc: 'Color-coded line franchise terminals from East Bajac-Bajac to Gordon Heights.' },
];

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameValid = fullname.trim().length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const { hasMinLength, hasUppercase, hasNumber } = passwordChecks(password);
    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setError('Password must meet all 3 safety criteria: 6+ characters, uppercase letter, and a number.');
      return;
    }
    if (!terms) {
      setError('Please accept the Terms of Transit Service and Safety Guidelines.');
      return;
    }
    setLoading(true);
    try {
      const data = await withPageLoading(showLoading, hideLoading, 'Creating your Fairtrike account...', () =>
        apiRegister({ fullname, email, password })
      );
      setSuccess(`${data.message || 'Account created!'} Redirecting to your booking hub...`);
      setTimeout(async () => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const body = await res.json();
          if (body.token) { login(body.token, body.user); navigate('/app'); return; }
        } catch { /* fall through */ }
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthSplit
      perks={PERKS}
      formBadge="Fast 1-Minute Passenger Sign-Up"
      formTitle="Create Account"
      formSubtitle="Start your journey with Fairtrike today and enjoy reliable, metered commutes."
      bottom={(
        <div className="pt-0.5 text-center space-y-1">
          <p className="text-[12px] leading-5 text-secondary">
            Already have an account?
            <Link className="text-[13px] text-primary hover:text-on-primary-container font-bold underline transition-colors ml-1" to="/login">
              Sign In
            </Link>
          </p>
          <div className="flex items-center justify-center gap-4 pt-1 text-secondary font-label-sm text-label-sm">
            <Link className="hover:text-on-surface transition-colors flex items-center gap-1" to="/register-driver">
              <span className="material-symbols-outlined text-base">support_agent</span>
              Driver Application
            </Link>
            <span className="text-surface-container-high">•</span>
            <Link className="hover:text-on-surface transition-colors flex items-center gap-1" to="/driver-info">
              <span className="material-symbols-outlined text-base">local_police</span>
              Barangay Helpdesk
            </Link>
          </div>
        </div>
      )}
    >
      <ErrorAlert message={error} onClose={() => setError('')} />
      <SuccessAlert message={success} />
      <form className="flex flex-col gap-1.5" onSubmit={handleSubmit}>
        <TextField
          id="fullName"
          label="Full Name"
          icon="person"
          type="text"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          placeholder="Enter your full name, e.g., Juan Dela Cruz"
          required
          valid={nameValid}
          hint="Must match your valid government or student ID for passenger insurance verification."
        />
        <TextField
          id="email"
          label="Email Address"
          icon="mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@mail.com"
          required
          valid={emailValid}
          hint="We will send automated electronic ride fare receipts here."
        />
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
        <TermsCheckbox
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          label={(
            <span>
              I accept the <span className="font-bold text-on-surface underline">Terms of Transit Service</span> and agree to Fairtrike&#8217;s <span className="font-bold text-on-surface underline">Commuter Safety &amp; Fair Fare Guidelines</span> in Olongapo.
            </span>
          )}
        />
        <SubmitButton loading={loading} loadingText="Registering Passenger...">Create Account</SubmitButton>
      </form>
    </AuthSplit>
  );
}

