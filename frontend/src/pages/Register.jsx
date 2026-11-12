import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiRegister } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, TextField, PasswordField, SubmitButton } from '../components/AuthSplit.jsx';

const PERKS = [
  { icon: 'local_taxi', iconBg: 'bg-primary-container text-on-primary-container', title: 'Metered Fares', desc: 'Transparent, government-regulated pricing.' },
  { icon: 'payments', iconBg: 'bg-tertiary-container text-on-tertiary-container', title: 'Ride Tracking', desc: 'Live GPS tracking for every trip.' },
];

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [fullname, setFullname] = useState('');
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
    if (!fullname.trim()) return setError('Full name is required.');
    if (!emailOk) return setError('Valid email is required.');
    if (!password || password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const data = await withPageLoading(showLoading, hideLoading, 'Creating your account...', () =>
        apiRegister({ fullname: fullname.trim(), email: email.trim().toLowerCase(), password })
      );
      setSuccess(data.message || 'Account created! Your account is pending admin approval. You will be able to sign in once approved.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit
      heroEyebrow='Commuter'
      heroTitle='Create Account'
      heroSubtitle='Join thousands of commuters booking tricycle rides across Olongapo City.'
      perks={PERKS}
      quote='â€œNever have to haggle with fares again.â€'
      formBadge='Passenger Sign-Up'
      formTitle='Create Account'
      formSubtitle='Start your journey with Fairtrike today.'
      bottom={
        <div className='pt-0.5 text-center space-y-1'>
          <p className='text-[12px] leading-5 text-secondary'>
            Already have an account?{' '}
            <Link className='text-[13px] text-primary font-bold underline ml-1' to='/login'>Sign In</Link>
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
          id='regFullName'
          label='Full Name'
          icon='person'
          type='text'
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          placeholder='Juan Dela Cruz'
          required
          valid={fullname.trim().length >= 3}
        />
        <TextField
          id='regEmail'
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
          placeholder='Min. 6 characters'
          id='regPassword'
          withMeter={false}
        />
        <SubmitButton loading={loading} loadingText='Creating account...'>Create Account</SubmitButton>
      </form>
    </AuthSplit>
  );
}
