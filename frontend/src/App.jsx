import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { BrandLoader } from './components/BrandLoader.jsx';
import { homePathFor, isDriver, isAdmin } from './lib/roles.js';
import { onAdminPort, separateAdminPort, goToAdminPort, goToAppPort } from './lib/ports.js';
import { Landing } from './pages/Landing.jsx';
import { Login } from './pages/Login.jsx';
import { DriverLogin } from './pages/DriverLogin.jsx';
import { Register } from './pages/Register.jsx';
import { DriverRegister } from './pages/DriverRegister.jsx';
import { DriverInfo } from './pages/DriverInfo.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { MapApp } from './app/MapApp.jsx';
import { DriverApp } from './pages/DriverApp.jsx';
import { DriverEarnings } from './pages/DriverEarnings.jsx';
import { DriverHistory } from './pages/DriverHistory.jsx';
import { DriverAccount } from './pages/DriverAccount.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { AccountPage } from './pages/AccountPage.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { AdminLogin } from './pages/AdminLogin.jsx';
import { InstallPrompt } from './components/InstallPrompt.jsx';

export function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <BrandLoader message="Checking your session..." />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Commuter surfaces (/app, /dashboard) — drivers get bounced to their own interface.
export function PassengerOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <BrandLoader message="Checking your session..." />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Admins live on the admin dashboard — which has its own port in this setup.
  if (isAdmin(user)) {
    if (separateAdminPort()) {
      goToAdminPort('/admin');
      return null;
    }
    return <Navigate to="/admin" replace />;
  }
  if (isDriver(user)) {
    return <Navigate to="/driver" replace />;
  }
  return children;
}

// Driver console (/driver) — passengers get bounced to the commuter app.
export function DriverOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <BrandLoader message="Checking your session..." />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Admins live on the admin dashboard — which has its own port in this setup.
  if (isAdmin(user)) {
    if (separateAdminPort()) {
      goToAdminPort('/admin');
      return null;
    }
    return <Navigate to="/admin" replace />;
  }
  if (!isDriver(user)) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

// Admin console (/admin) — only role === 'admin'.
export function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <BrandLoader message="Checking your session..." />;
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!isAdmin(user)) {
    // Served by the admin dashboard's own port: bounce non-admins back to the
    // app, where they can sign in with the right credentials.
    if (onAdminPort()) {
      goToAppPort('/login');
      return null;
    }
    return <Navigate to={isDriver(user) ? '/driver' : '/app'} replace />;
  }
  return children;
}

export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <BrandLoader message="Checking your session..." />;
  }
  if (user) {
    return <Navigate to={homePathFor(user)} replace />;
  }
  return children;
}

export function App() {
  return (
    <>
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/login-driver" element={<GuestOnly><DriverLogin /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/register-driver" element={<GuestOnly><DriverRegister /></GuestOnly>} />
      <Route path="/driver-info" element={<DriverInfo />} />
      <Route path="/app" element={<PassengerOnly><MapApp /></PassengerOnly>} />
      <Route path="/dashboard" element={<PassengerOnly><Dashboard /></PassengerOnly>} />
      <Route path="/driver" element={<DriverOnly><DriverApp /></DriverOnly>} />
      <Route path="/driver/earnings" element={<DriverOnly><DriverEarnings /></DriverOnly>} />
      <Route path="/driver/history" element={<DriverOnly><DriverHistory /></DriverOnly>} />
      <Route path="/driver/account" element={<DriverOnly><DriverAccount /></DriverOnly>} />
      <Route path="/history" element={<PassengerOnly><HistoryPage /></PassengerOnly>} />
      <Route path="/account" element={<PassengerOnly><AccountPage /></PassengerOnly>} />
      <Route path="/admin/login" element={<GuestOnly><AdminLogin /></GuestOnly>} />
      <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}