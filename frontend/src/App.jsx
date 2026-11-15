import React, { Suspense, lazy } from 'react';
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
import { PendingApproval } from './pages/PendingApproval.jsx';

// Lazy-load heavy components to reduce initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard.jsx').then((m) => ({ default: m.Dashboard })));
const MapApp = lazy(() => import('./app/MapApp.jsx').then((m) => ({ default: m.MapApp })));
const DriverApp = lazy(() => import('./pages/DriverApp.jsx').then((m) => ({ default: m.DriverApp })));
const DriverEarnings = lazy(() => import('./pages/DriverEarnings.jsx').then((m) => ({ default: m.DriverEarnings })));
const DriverHistory = lazy(() => import('./pages/DriverHistory.jsx').then((m) => ({ default: m.DriverHistory })));
const DriverAccount = lazy(() => import('./pages/DriverAccount.jsx').then((m) => ({ default: m.DriverAccount })));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx').then((m) => ({ default: m.HistoryPage })));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx').then((m) => ({ default: m.AccountPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx').then((m) => ({ default: m.AdminDashboard })));
import { AdminLogin } from './pages/AdminLogin.jsx';
import { InstallPrompt } from './components/InstallPrompt.jsx';

// Check if user has approved status (stored in localStorage/sessionStorage with user object)
function isApproved(user) {
  return user?.status === 'approved';
}

// Check if user is admin (admins don't need approval - created directly as approved)
function isAdminUser(user) {
  return user?.role === 'admin';
}

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
  // Check approval status for passengers
  if (!isApproved(user) && !isAdminUser(user)) {
    return <Navigate to="/pending-approval" replace />;
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
  // Check approval status for drivers (backend login already blocks, but guard as safety)
  if (!isApproved(user) && !isAdminUser(user)) {
    return <Navigate to="/pending-approval" replace />;
  }
  return children;
}

// Admin console (/admin) — only role === 'admin'.
export function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  console.log('[AdminOnly] rendering:', { loading, user, isAdmin: isAdmin(user) });
  if (loading) {
    return <BrandLoader message="Checking your session..." />;
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  // Explicitly allow admins on the admin port — never redirect them away.
  if (isAdmin(user)) {
    return children;
  }
  // Non-admin users on the admin port get sent to the app port login.
  if (separateAdminPort() && onAdminPort()) {
    goToAppPort('/login');
    return null;
  }
  // Non-admin users on the app port get redirected to their home.
  return <Navigate to={isDriver(user) ? '/driver' : '/app'} replace />;
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
      <Suspense fallback={<BrandLoader message="Loading..." />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/login-driver" element={<GuestOnly><DriverLogin /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/register-driver" element={<GuestOnly><DriverRegister /></GuestOnly>} />
          <Route path="/driver-info" element={<DriverInfo />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
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
      </Suspense>
      <InstallPrompt />
    </>
  );
}