import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiLoginAdmin } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, TextField, PasswordField, SubmitButton } from '../components/AuthSplit.jsx';

const PERKS = [
  { icon: 'shield_person', iconBg: 'bg-primary-container text-on-primary-container', title: 'Fleet oversight', desc: 'Review driver applications and verify tricycle operators.' },
  { icon: 'verified', iconBg: 'bg-tertiary-container text-on-tertiary-container', title: 'Ride audit', desc: 'Full ride log with passenger, driver, fare, and status.' },
];

export function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Email is required.');
    if (!password) return setError('Password is required.');
    setLoading(true);
    try {
      const data = await withPageLoading(showLoading, hideLoading, 'Signing you in…', () =>
        apiLoginAdmin({ email: email.trim().toLowerCase(), password })
      );
      login(data.token, data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit
      heroEyebrow='Administrator'
      heroTitle='Admin Sign In'
      heroSubtitle='Authorized personnel only.'
      perks={PERKS}
      quote='“Fairtrike keeps our transit running safely.”'
      formBadge='Admin Access'
      formTitle='Admin Sign In'
      formSubtitle='Enter your administrator credentials to open the Operations Console.'
      bottom={
        <div className='pt-0.5 text-center space-y-1'>
          <p className='text-[12px] leading-5 text-secondary'>
            This console is for administrators only.
          </p>
          <div className='flex items-center justify-center gap-4 pt-1 text-secondary font-label-sm'>
            <Link className='hover:text-on-surface transition-colors flex items-center gap-1' to='/login'>
              <span className='material-symbols-outlined text-base'>person</span> Commuter Sign In
            </Link>
            <span className='text-surface-container-high'>·</span>
            <Link className='hover:text-on-surface transition-colors flex items-center gap-1' to='/'>
              Return to the Fairtrike app
            </Link>
          </div>
        </div>
      }
    >
      <ErrorAlert message={error} onClose={() => setError('')} />
      <form className='flex flex-col gap-1.5' onSubmit={handleSubmit}>
        <TextField
          id='adminLoginEmail'
          label='Email Address'
          icon='mail'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='admin@fairtrike.test'
          required
          valid={emailOk}
        />
        <PasswordField
          label='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='Enter your password'
          id='adminLoginPassword'
          withMeter={false}
        />
        <div className='pt-0.5 flex items-center gap-2'>
          <input
            id='rememberDevice'
            type='checkbox'
            className='w-3.5 h-3.5 rounded border-[#8fa3c4] text-primary-container focus:ring-primary accent-primary'
          />
          <label htmlFor='rememberDevice' className='text-[12px] text-secondary cursor-pointer select-none'>
            Remember device
          </label>
        </div>
        <div className='text-right mt-0.5'>
          <Link to='/login' className='text-[11px] text-primary hover:text-on-primary-container font-bold underline transition-colors'>
            Forgot password?
          </Link>
        </div>
        <SubmitButton loading={loading} loadingText='Signing in…'>Sign In</SubmitButton>
      </form>
    </AuthSplit>
  );
}