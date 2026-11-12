import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiLoginDriver } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, TextField, PasswordField, SubmitButton } from '../components/AuthSplit.jsx';

const PERKS = [
  { icon: 'two_wheeler', iconBg: 'bg-primary-container text-on-primary-container', title: 'Duty Console', desc: 'Go on duty and receive ride requests in one place.' },
  { icon: 'payments', iconBg: 'bg-tertiary-container text-on-tertiary-container', title: 'Trip earnings', desc: 'Fares are computed from the route distance.' },
];

export function DriverLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        apiLoginDriver({ email: email.trim().toLowerCase(), password })
      );
      if (data.user?.role !== 'driver') {
        setError('This sign-in is for drivers. Please use the commuter sign-in instead.');
        setLoading(false);
        return;
      }
      login(data.token, data.user);
      setSuccess('Welcome back! Opening your duty console...');
      setTimeout(() => navigate('/driver'), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit
      heroEyebrow='Driver'
      heroTitle='Driver Sign In'
      heroSubtitle='Access your duty console — receive ride requests and track trips.'
      perks={PERKS}
      quote='“Fairtrike keeps my trips organized.”'
      formBadge='Driver Access'
      formTitle='Driver Sign In'
      formSubtitle='Enter your driver credentials to open your duty console.'
      bottom={
        <div className='pt-0.5 text-center space-y-1'>
          <p className='text-[12px] leading-5 text-secondary'>
            Not yet a driver partner?
            <Link className='text-[13px] text-primary hover:text-on-primary-container font-bold underline transition-colors ml-1' to='/register-driver'>Apply as Driver</Link>
          </p>
          <p className='text-[12px] leading-5 text-secondary'>
            Forgot your password?
            <Link className='text-[13px] text-primary hover:text-on-primary-container font-bold underline ml-1' to='/reset-password'>
              Request Reset
            </Link>
          </p>
          <div className='flex items-center justify-center gap-4 pt-1 text-secondary font-label-sm text-label-sm'>
            <Link className='hover:text-on-surface transition-colors flex items-center gap-1' to='/login'>
              <span className='material-symbols-outlined text-base'>person</span> Commuter Sign In
            </Link>
            <span className='text-surface-container-high'>·</span>
            <Link className='hover:text-on-surface transition-colors flex items-center gap-1' to='/driver-info'>
              Driver Info
            </Link>
          </div>
        </div>
      }
    >
      <ErrorAlert message={error} onClose={() => setError('')} />
      <SuccessAlert message={success} />
      <form className='flex flex-col gap-1.5' onSubmit={handleSubmit}>
        <TextField
          id='driverLoginEmail'
          label='Driver Email Address'
          icon='mail'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='driver@example.com'
          required
          valid={emailOk}
        />
        <PasswordField
          label='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='Enter your password'
          id='driverLoginPassword'
          withMeter={false}
        />
        <SubmitButton loading={loading} loadingText='Signing in...'>Open Duty Console</SubmitButton>
      </form>
    </AuthSplit>
  );
}
