import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiResetPassword } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, PasswordField, SubmitButton, TextField } from '../components/AuthSplit.jsx';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // A reset link without a token is invalid — send the user to the request page instead.
  if (!token) {
    return (
      <AuthSplit
        heroEyebrow='Password Reset'
        heroTitle='Invalid Reset Link'
        heroSubtitle='This reset link is missing a token and cannot be used.'
        formBadge='Password Reset'
        formTitle='Invalid Reset Link'
        formSubtitle='Please request a new reset link from the login page.'
        bottom={
          <div className='pt-0.5 text-center space-y-1'>
            <p className='text-[12px] leading-5 text-secondary'>
              Don&apos;t have a reset link?{' '}
              <Link className='text-[13px] text-primary hover:text-on-primary-container font-bold underline ml-1' to='/forgot-password'>
                Request Reset
              </Link>
            </p>
          </div>
        }
      >
        <ErrorAlert message='The reset link is invalid or missing a token. Please request a new one.' />
      </AuthSplit>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newPassword) return setError('New password is required.');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters long.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await withPageLoading(showLoading, hideLoading, 'Resetting your password…', () =>
        apiResetPassword({ token, new_password: newPassword })
      );
      setSuccess('Password has been reset successfully. You can now sign in.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplit
      heroEyebrow='Password Reset'
      heroTitle='Reset Your Password'
      heroSubtitle='Enter your new password to complete the reset.'
      formBadge='Password Reset'
      formTitle='Set New Password'
      formSubtitle='Your reset link is valid. Choose a new password to continue.'
      bottom={
        <div className='pt-0.5 text-center space-y-1'>
          <p className='text-[12px] leading-5 text-secondary'>
            Already have access?{' '}
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
          id='resetNewPassword'
          label='New Password'
          icon='lock'
          type='password'
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder='Enter your new password'
          required
        />
        <TextField
          id='resetConfirmPassword'
          label='Confirm New Password'
          icon='lock'
          type='password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder='Confirm your new password'
          required
        />
        <SubmitButton loading={loading} loadingText='Resetting…'>Reset Password</SubmitButton>
      </form>
    </AuthSplit>
  );
}
