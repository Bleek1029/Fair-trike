import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiForgotPassword, apiResetPassword } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';
import { AuthSplit, ErrorAlert, SuccessAlert, PasswordField, SubmitButton, TextField } from '../components/AuthSplit.jsx';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim()) return setError('Email is required.');
    setLoading(true);
    try {
      await withPageLoading(showLoading, hideLoading, 'Sending reset code…', () =>
        apiForgotPassword({ email: email.trim().toLowerCase() })
      );
      setStep('code');
      setSuccess('Reset code sent! Check your email and enter it below.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!code.trim()) return setError('Reset code is required.');
    if (!newPassword) return setError('New password is required.');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters long.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await withPageLoading(showLoading, hideLoading, 'Resetting your password…', () =>
        apiResetPassword({ code: code.trim(), new_password: newPassword })
      );
      setSuccess('Password has been reset successfully. You can now sign in.');
      setNewPassword('');
      setConfirmPassword('');
      setCode('');
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
      heroTitle='Forgot Password.'
      heroSubtitle='Enter your email and we will send you a reset code.'
      formBadge='Password Reset'
      formTitle={step === 'email' ? 'Request Reset Code' : 'Enter Reset Code'}
      formSubtitle={step === 'email'
        ? 'We will send a password reset code to your email address.'
        : 'Enter the 6-digit code sent to your email and choose a new password.'}
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
      <form className='flex flex-col gap-1.5' onSubmit={step === 'email' ? handleRequestCode : handleResetPassword}>
        {step === 'email' && (
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
        )}
        {step === 'code' && (
          <>
            <TextField
              id='resetCode'
              label='Reset Code'
              icon='vpn_key'
              type='text'
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder='123456'
              required
            />
            <PasswordField
              label='New Password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              id='resetNewPassword'
            />
            <PasswordField
              label='Confirm New Password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              id='resetConfirmPassword'
            />
          </>
        )}
        <SubmitButton loading={loading} loadingText={step === 'email' ? 'Sending…' : 'Resetting…'}>
          {step === 'email' ? 'Send Reset Code' : 'Reset Password'}
        </SubmitButton>
        {step === 'code' && (
          <button
            type='button'
            onClick={() => setStep('email')}
            className='w-full min-h-[40px] px-6 py-1.5 rounded-xl border border-surface-container text-on-surface text-[13px] font-bold tracking-tight hover:bg-surface-container-low transition-all duration-200 flex items-center justify-center gap-2'
          >
            <span className='material-symbols-outlined text-[16px]'>arrow_back</span>
            Back to email
          </button>
        )}
      </form>
    </AuthSplit>
  );
}
