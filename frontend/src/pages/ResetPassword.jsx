import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiResetPasswordRequest } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, TextField, PasswordField, SubmitButton } from '../components/AuthSplit.jsx';

export function ResetPassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim()) return setError('Email is required.');
    if (!newPassword) return setError('New password is required.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await withPageLoading(showLoading, hideLoading, 'Submitting reset request…', () =>
        apiResetPasswordRequest({ email: email.trim().toLowerCase(), new_password: newPassword })
      );
      setSuccess('Reset request submitted! An admin will approve it shortly.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDriver = user?.role === 'driver';

  return (
    <AuthSplit
      heroEyebrow='Password Reset'
      heroTitle='Reset Your Password'
      heroSubtitle='Enter your email and new password. An admin will review and approve the change before it takes effect.'
      formBadge='Password Reset'
      formTitle='Request Password Reset'
      formSubtitle='We will verify your identity and update your password once an admin approves the request.'
      bottom={
        <div className='pt-0.5 text-center space-y-1'>
          <p className='text-[12px] leading-5 text-secondary'>
            Already have access?{' '}
            <Link className='text-[13px] text-primary hover:text-on-primary-container font-bold underline ml-1' to={isDriver ? '/login-driver' : '/login'}>
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
          id='resetEmail'
          label='Email Address'
          icon='mail'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='driver@example.com'
          required
        />
        <PasswordField
          label='New Password'
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder='Enter your new password'
          id='resetNewPassword'
          withMeter={false}
        />
        <PasswordField
          label='Confirm New Password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder='Confirm your new password'
          id='resetConfirmPassword'
          withMeter={false}
        />
        <SubmitButton loading={loading} loadingText='Submitting…'>Request Reset</SubmitButton>
      </form>
    </AuthSplit>
  );
}
