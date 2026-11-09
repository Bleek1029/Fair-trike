import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiLogin, apiResetPassword } from '../api.js';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Forgot-password modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin({ email, password });
      login(data.token, data.user);
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetMsg('');
    if (newPassword !== confirmPassword) {
      setResetMsg('❌ Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setResetMsg('❌ Password must be at least 6 characters long.');
      return;
    }
    setResetLoading(true);
    try {
      const data = await apiResetPassword({ email: resetEmail, new_password: newPassword });
      setResetMsg(`✅ ${data.message}`);
      setTimeout(() => {
        setModalOpen(false);
        setResetMsg('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1800);
    } catch (err) {
      setResetMsg(`❌ ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container">
        <div className="brand-side">
          <img src="/Fairtrike.png" alt="Fairtrike Logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h3>Welcome Back</h3>
          <p>Your trusted transportation partner in Olongapo City. Safe, reliable, and affordable rides at your fingertips.</p>
        </div>

        <div className="form-side">
          <div className="form-header">
            <h2>Sign In</h2>
            <p>Access your Fairtrike account</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)}>
                <span>{showPw ? '🙈' : '👁️'}</span>
              </button>
            </div>

            <button type="submit" className="btn-signup" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="link-row">
            <button className="link-button" onClick={() => setModalOpen(true)}>Forgot Password?</button>
          </div>

          <div className="footer-link">
            Don&apos;t have an account? <Link to="/register">Create Account</Link>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="modal" onClick={(e) => { if (e.target.className === 'modal') setModalOpen(false); }}>
          <div className="modal-content">
            <h3>🔑 Reset Your Password</h3>
            <form onSubmit={handleReset}>
              <div className="form-group">
                <label htmlFor="reset-email">Email Address</label>
                <input type="email" id="reset-email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input type="password" id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input type="password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              {resetMsg && <div className={resetMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'}>{resetMsg}</div>}
              <button type="submit" className="btn-signup" disabled={resetLoading}>
                {resetLoading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
            <button type="button" className="clear-btn" onClick={() => setModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}