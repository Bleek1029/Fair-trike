import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiLogin } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, TextField, PasswordField, SubmitButton } from '../components/AuthSplit.jsx';

const PERKS = [
  { icon: 'verified', iconBg: 'bg-primary-container text-on-primary-container', title: 'Verified Olongapo Fleet', desc: 'Every tricycle is registered with official TODA franchise badges and background checks.' },
  { icon: 'payments', iconBg: 'bg-tertiary-container text-on-tertiary-container', title: 'Guaranteed City Tariff', desc: 'Accurate automated computing eliminates overcharging and protects your fare rights.' },
  { icon: 'security', iconBg: 'bg-secondary-fixed text-on-secondary-fixed', title: 'Live Ride Security', desc: 'Instant route tracking with direct PNP Olongapo 911 coordination and in-app SOS.' },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim()) return setError('Email is required.');
    if (!password) return setError('Password is required.');
    setLoading(true);
    try {
      const data = await withPageLoading(showLoading, hideLoading, 'Signing you in...', () =>
        apiLogin({ email: email.trim().toLowerCase(), password })
      );
      login(data.token, data.user);
      setSuccess('Success! Redirecting to your dashboard...');
      setTimeout(() => navigate('/app'), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = () => {
    setError('Password resets require identity verification. Please contact the Olongapo TODA helpdesk at (047) 222-2565.');
  };

  return (
    <AuthSplit
      heroEyebrow='Sign In'
      heroTitle='Welcome Back'
      heroSubtitle='Access your Fairtrike commuter or TODA driver partner account.'
      perks={PERKS}
      formBadge='Sign In to Your Account'
      formTitle='Sign In'
      formSubtitle='Enter your credentials to access your dashboard.'
      bottom={
        <div className='pt-0.5 text-center space-y-1'>
          <p className='text-[12px] leading-5 text-secondary'>
            Don't have an account?
            <Link className='text-[13px] text-primary hover:text-on-primary-container font-bold underline transition-colors ml-1' to='/register'>Sign Up</Link>
          </p>
          <div className='flex items-center justify-center gap-4 pt-1 text-secondary font-label-sm text-label-sm'>
            <Link className='hover:text-on-surface transition-colors flex items-center gap-1' to='/register-driver'>
              <span className='material-symbols-outlined text-base'>support_agent</span> Driver Application
            </Link>
            <span className='text-surface-container-high'>·</span>
            <Link className='hover:text-on-surface transition-colors flex items-center gap-1' to='/driver-info'>
              <span className='material-symbols-outlined text-base'>local_police</span> Barangay Helpdesk
            </Link>
          </div>
        </div>
      }
    >
      <ErrorAlert message={error} onClose={() => setError('')} />
      <SuccessAlert message={success} />
      <form className='flex flex-col gap-1.5' onSubmit={handleSubmit}>
        <TextField
          id='loginEmail'
          label='Email Address'
          icon='mail'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='you@example.com'
          required
          valid={emailOk}
        />
        <PasswordField
          label='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='Enter your password'
          id='loginPassword'
          withMeter={false}
        />
        <div className='flex items-center justify-between pt-0.5'>
          <label className='flex items-center gap-2 cursor-pointer select-none group'>
            <input className='peer sr-only' type='checkbox' checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <div className={"w-4 h-4 rounded transition-all flex items-center justify-center " + (remember ? 'bg-on-background border border-on-background' : 'bg-white border-2 border-[#8fa3c4]')}>
              <span className={"material-symbols-outlined text-white text-[14px] font-bold transition-opacity " + (remember ? 'opacity-100' : 'opacity-0')}>check</span>
            </div>
            <span className='text-[11px] leading-4 text-secondary group-hover:text-on-surface transition-colors'>Remember device</span>
          </label>
          <button type='button' className='text-[11px] text-primary hover:text-on-primary-container font-bold underline transition-colors' onClick={handleResetRequest}>Forgot password?</button>
        </div>
        <div className='flex items-center gap-2 p-2 rounded-lg bg-surface-container'>
          <span className='material-symbols-outlined text-[16px] text-secondary'>network_check</span>
          <span className='text-[10px] leading-3 text-on-surface-variant font-semibold'>256-bit encrypted transit credential vault</span>
        </div>
        <SubmitButton loading={loading} loadingText='Signing in...'>Sign In</SubmitButton>
      </form>
    </AuthSplit>
  );
}
