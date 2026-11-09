import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dash-page">
      <header className="header">
        <div className="logo">
          <img src="/Fairtrike.png" alt="Fairtrike Logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h1>Fairtrike</h1>
        </div>
        <div className="user-info">
          <div className="user-welcome">Welcome, {user.fullname}!</div>
          <button className="btn-logout" onClick={() => { logout(); }}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="container centered">
        <div className="dashboard-card">
          <div className="welcome-icon">🚕</div>
          <h2>Welcome to Your Dashboard</h2>
          <p>Your trusted transportation partner in Olongapo City. Safe, reliable, and affordable rides at your fingertips.</p>

          <div className="user-details">
            <h3>Your Account Information</h3>
            <div className="detail-row"><span className="detail-label">Full Name:</span><span className="detail-value">{user.fullname}</span></div>
            <div className="detail-row"><span className="detail-label">Email Address:</span><span className="detail-value">{user.email}</span></div>
            <div className="detail-row"><span className="detail-label">User ID:</span><span className="detail-value">{user.id}</span></div>
          </div>

          <div className="action-buttons">
            <Link to="/app" className="btn-primary">Book a Ride</Link>
            <button className="btn-secondary" onClick={() => alert('Trip history coming soon!')}>View History</button>
          </div>
        </div>
      </div>
    </div>
  );
}