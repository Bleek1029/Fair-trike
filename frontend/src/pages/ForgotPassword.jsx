import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiForgotPassword } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, TextField, SubmitButton } from '../components/AuthSplit.jsx';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim()) return setError('Email is required.');
    setLoading(true);
    try {
      await withPageLoading(showLoading, hideLoading, 'Sending reset link…', () =>
        apiForgotPassword({ email: email.trim().toLowerCase() })
      );
      setSuccess('Reset request submitted! An admin will review and approve it before you can reset your password.');
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit
      heroEyebrow='Password Reset'
      heroTitle='Forgot Password.'
      heroSubtitle='Enter your email and we will send you a reset link.'
      formBadge='Password Reset'
      formTitle='Request Reset'
      formSubtitle='We will send a password reset link to your email address.'
      bottom={
        <div className='pt-0.5 text-center space-y-1'>
          <p className='text-[12px] leading-5 text-secondary'>
            Remember your password?{' '}
            <Link className='text-[13px] text-primary hover:text-on-primary-container font-bold underline ml-1' to='/login'>
              Sign In
            </Link>
          </p>
        </div>
      }
    >
      <ErrorAlert message={error} onClose={() => setError('')} />
      <SuccessAlert message={success} />
      <form className='flex flex-col gap-1.5' onSubmit={handleSubmit}>
        <TextField
          id='forgotEmail'
          label='Email Address'
          icon='mail'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='example@mail.com'
          required
        />
        <SubmitButton loading={loading} loadingText='Sending…'>Send Reset Link</SubmitButton>
      </form>
    </AuthSplit>
  );
}
