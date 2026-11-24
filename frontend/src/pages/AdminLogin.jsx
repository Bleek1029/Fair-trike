// ── Admin Login Page ────────────────────────────────────
// Fairtrike Operations Console - admin sign in
// Updated UI: crisp pixel-art tricycle brand, Inter typography,
// brand slate/green palette, password visibility toggle.
import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiLoginAdmin } from '../api.js';
import { usePageLoading, withPageLoading } from '../loading/LoadingContext.jsx';

export function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = usePageLoading();
  const [email, setEmail] = useState('admin@fairtrike.test');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailValue = email.trim().toLowerCase();
    const passwordValue = password;
    if (!emailValue) return setError('Email is required.');
    if (!passwordValue) return setError('Password is required.');
    setLoading(true);
    try {
      const data = await withPageLoading(showLoading, hideLoading, 'Signing you in…', () =>
        apiLoginAdmin({ email: emailValue, password: passwordValue })
      );
      login(data.accessToken, data.user, { remember: true });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = useCallback(() => setShowPassword((prev) => !prev), []);

  const LOGO_SRC =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC7_1yktC2A9sNS6y2Gse90yeGLKpcAT9-O973JWgP9ZK1g0ArNkdt-2apkw5aOmFt_wuP3TgIJHViQJF8g-_UWo0rnpoHbDmtHY5o0H0XWhpBjXF_W5ZNCr39uFMWliPH0w9Hj5-FnLY__6iosftUbsH9byCrGD4r1DhhHfmZhcJ8S9ryaUJ11wydnj5GH_t4bTJ31T9iuv4mvQpP_hWFonIUmBOFS57UvWDFTgwhpgHE-KjX6cKuG';

  return (
    <div className="min-h-[100vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-slate-800 bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-100">
      <main className="w-full max-w-[440px] flex flex-col items-center">
        {/* Brand Header */}
        <header className="text-center mb-6 flex flex-col items-center">
          <div className="mb-3 p-2 rounded-2xl bg-white shadow-sm border border-slate-200/80 transition-transform duration-200 hover:scale-105">
            <img
              alt="Fairtrike Logo"
              className="w-16 h-16 object-contain block"
              height="64"
              src={LOGO_SRC}
              style={{ imageRendering: 'pixelated' }}
              width="64"
            />
          </div>
          <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-slate-900 leading-snug">
            Admin Sign In
          </h1>
          <p className="mt-1 text-sm font-medium text-[#059669] tracking-normal">
            Fairtrike Operations Console
          </p>
        </header>

        {/* Auth Card */}
        <div className="w-full rounded-2xl p-7 sm:p-9 bg-white shadow-sm border border-slate-200/80 transition-all">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container text-error text-sm animate-slide-in flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fairtrike.test"
                  required
                  className="block w-full rounded-xl border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#065f46] focus:ring-2 focus:ring-[#065f46]/15 focus:outline-none transition duration-150"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="block w-full rounded-xl border-slate-200 bg-slate-50/60 pl-3.5 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#065f46] focus:ring-2 focus:ring-[#065f46]/15 focus:outline-none transition duration-150 pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 text-sm font-semibold rounded-xl text-white bg-[#064e3b] hover:bg-[#047857] active:bg-[#022c22] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#064e3b] transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>

            {/* Divider */}
            <div aria-hidden="true" className="pt-2 border-t border-slate-100"></div>

            {/* Back Link */}
            <div className="text-center pt-0.5">
              <Link
                to="/"
                className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors duration-150 group"
              >
                <span className="mr-1.5 transition-transform duration-150 group-hover:-translate-x-0.5">
                  ←
                </span>
                Back to Fairtrike App
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AdminLogin;
