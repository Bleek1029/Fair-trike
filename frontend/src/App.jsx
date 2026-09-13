import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { BrandLoader } from './components/BrandLoader.jsx';
import { Landing } from './pages/Landing.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { DriverRegister } from './pages/DriverRegister.jsx';
import { DriverInfo } from './pages/DriverInfo.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { MapApp } from './app/MapApp.jsx';
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

export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <BrandLoader message="Checking your session..." />;
  }
  if (user) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

export function App() {
  return (
    <>
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/register-driver" element={<GuestOnly><DriverRegister /></GuestOnly>} />
      <Route path="/driver-info" element={<DriverInfo />} />
      <Route path="/app" element={<Protected><MapApp /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}