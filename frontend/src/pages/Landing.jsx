import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Welcome landing removed — root route now redirects straight to sign-in ──
export function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);
  return null;
}