import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiRegister } from '../api.js';

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await apiRegister({ fullname, email, password });
      setSuccess(data.message);
      // Auto-login after a short delay, mirroring the PHP redirect.
      setTimeout(async () => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const body = await res.json();
          if (body.token) {
            login(body.token, body.user);
            navigate('/app');
            return;
          }
        } catch { /* fall through to login page */ }
        navigate('/login');
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container">
        <div className="brand-side">
          <img src="/Fairtrike.png" alt="Fairtrike Logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h3>Join Fairtrike</h3>
          <p>Your trusted transportation partner in Olongapo City. Safe, reliable, and affordable rides at your fingertips.</p>
        </div>

        <div className="form-side">
          <div className="form-header">
            <h2>Create Account</h2>
            <p>Start your journey with Fairtrike today</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullname">Full Name</label>
              <input type="text" id="fullname" value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder="Enter your full name" required />
            </div>
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
                placeholder="Min. 6 characters"
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)}>
                <span>{showPw ? '🙈' : '👁️'}</span>
              </button>
            </div>

            <button type="submit" className="btn-signup" disabled={loading}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>

          <div className="footer-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}