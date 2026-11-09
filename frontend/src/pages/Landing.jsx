import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  { icon: '🛡️', title: 'Safe Rides', text: 'Vetted drivers and well-maintained vehicles for your safety' },
  { icon: '⚡', title: 'Quick Service', text: 'Fast pickup times and efficient routes to get you there' },
  { icon: '💰', title: 'Affordable Rates', text: 'Competitive pricing with no hidden fees' },
  { icon: '📱', title: 'Easy Booking', text: 'Simple app interface for hassle-free ride booking' },
];

export function Landing() {
  return (
    <div className="auth-page welcome-page">
      <header className="welcome-header">
        <div className="logo">
          <img src="/Fairtrike.png" alt="Fairtrike Logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h1>Fairtrike</h1>
        </div>
        <div className="nav-buttons">
          <Link to="/login" className="btn btn-secondary">Sign In</Link>
          <Link to="/register" className="btn btn-primary">Create Account</Link>
        </div>
      </header>

      <main className="main-content">
        <div className="welcome-card">
          <div className="welcome-icon">🚕</div>
          <h1>Welcome to Fairtrike</h1>
          <h2>Your Trusted Transportation Partner</h2>
          <p>
            Experience safe, reliable, and affordable rides in Olongapo City.
            We&apos;re committed to making your journey comfortable and convenient.
          </p>

          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>

          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary btn-large">Get Started</Link>
            <Link to="/app" className="btn btn-secondary btn-large">Go to Map</Link>
          </div>
        </div>
      </main>
    </div>
  );
}