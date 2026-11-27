import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { BrandLoader } from '../components/BrandLoader.jsx';

export function PendingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isApproved, setIsApproved] = useState(false);

  // Check if user is approved - redirect if they are
  useEffect(() => {
    const checkStatus = async () => {
      if (user) {
        try {
          // If status is missing, treat as pending so the user stays on this page
          // instead of being redirected away from the approval screen prematurely.
          const status = user.status || 'pending';
          if (status === 'approved') {
            setIsApproved(true);
            // Redirect to appropriate home page
            if (user.role === 'driver') {
              navigate('/driver', { replace: true });
            } else if (user.role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/app', { replace: true });
            }
          }
        } catch (e) {
          console.error('Status check failed:', e);
        } finally {
          setChecking(false);
        }
      } else {
        setChecking(false);
      }
    };
    checkStatus();
  }, [user, navigate]);

  if (checking) {
    return <BrandLoader message="Checking your account status..." />;
  }

  if (isApproved) {
    return <BrandLoader message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-primary">pending</span>
          </div>
          <h1 className="text-headline-lg font-bold">Account Pending Approval</h1>
          <p className="text-body-md text-on-surface-variant mt-2">
            Your account has been created but needs admin verification before you can use Fairtrike.
          </p>
        </div>

        {/* Status card */}
        <div className="rounded-2xl bg-surface-container-low p-6 border border-border mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-warning text-2xl">hourglass_empty</span>
            </div>
            <div>
              <p className="text-title-md font-bold">Waiting for Approval</p>
              <p className="text-body-sm text-on-surface-variant">
                An admin will review your application and approve it shortly.
              </p>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-xl">
            <p className="text-label-md font-bold text-on-surface-variant mb-2">Your Details:</p>
            <div className="space-y-1 text-body-sm">
              <p><span className="font-medium">Name:</span> {user?.fullname || '—'}</p>
              <p><span className="font-medium">Email:</span> {user?.email || '—'}</p>
              <p><span className="font-medium">Role:</span> {user?.role === 'driver' ? 'Driver' : 'Passenger'}</p>
              <p><span className="font-medium">Status:</span> <span className="text-warning font-bold">Pending</span></p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-lg font-bold"
          >
            <span className="material-symbols-outlined align-middle mr-2">logout</span>
            Sign Out
          </button>

          <div className="text-center text-body-sm text-on-surface-variant">
            <p>You'll receive a notification once your account is approved.</p>
            <p className="mt-1">Need help? Contact support.</p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link to="/" className="text-body-sm text-primary hover:underline flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Landing
          </Link>
        </div>
      </div>
    </div>
  );
}