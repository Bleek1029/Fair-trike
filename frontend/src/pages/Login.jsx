import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiLogin } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, TextField, PasswordField, SubmitButton } from '../components/AuthSplit.jsx';

const PERKS = [
  { icon: 'local_taxi', iconBg: 'bg-primary-container text-on-primary-container', title: 'Metered Fares', desc: 'Transparent, government-regulated pricing.' },
  { icon: 'payments', iconBg: 'bg-tertiary-container text-on-tertiary-container', title: 'Ride Tracking', desc: 'Live GPS tracking for every trip.' },
];

export function Login() {
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
        apiLogin({ email: email.trim().toLowerCase(), password })
      );
      login(data.token, data.user);
      setSuccess('Welcome back! Opening your booking hub...');
      setTimeout(() => navigate('/app'), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit
      heroEyebrow='Commuter'
      heroTitle='Welcome Back.'
      heroSubtitle='Sign in to book rides, view trip history, and manage your account.'
      perks={PERKS}
      quote='â€œFairtrike makes getting around Olongapo simple and fair.â€'
      formBadge='Commuter Access'
      formTitle='Sign In'
      formSubtitle='Enter your credentials to access your passenger account.'
      bottom={
        <div className='pt-0.5 text-center space-y-1'>
          <p className='text-[12px] leading-5 text-secondary'>
            Forgot your password?
            <Link className='text-[13px] text-primary hover:text-on-primary-container font-bold underline ml-1' to='/reset-password'>
              Request Reset
            </Link>
          </p>
          <p className='text-[12px] leading-5 text-secondary'>
            Don&apos;t have an account?
            <Link className='text-[13px] text-primary font-bold underline ml-1' to='/register'>Create Account</Link>
          </p>
          <div className='flex items-center justify-center gap-4 pt-1 text-secondary font-label-sm text-label-sm'>
            <Link className='hover:text-on-surface transition-colors flex items-center gap-1' to='/driver-info'>
              Driver Info
            </Link>
            <span className='text-surface-container-high'>Â·</span>
            <Link className='hover:text-on-surface transition-colors flex items-center gap-1' to='/register-driver'>
              Apply as Driver
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
          placeholder='example@mail.com'
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
        <SubmitButton loading={loading} loadingText='Signing in...'>Sign In</SubmitButton>
      </form>
    </AuthSplit>
  );
}

