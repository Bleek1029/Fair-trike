// ── Admin Dashboard ───────────────────────────────────────
// Fairtrike Operations Console - Full admin management interface
// Design System: Brutalism (dark tech + status green), Fira Code/Sans, Dense dashboard layout
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  apiAdminStats,
  apiAdminDrivers,
  apiSetDriverStatus,
  apiAdminUsers,
  apiAdminPendingUsers,
  apiSetUserStatus,
  apiAdminRides,
  apiAdminDocuments,
  apiSetDocumentStatus,
  apiAdminResetRequests,
  apiApproveResetRequest,
  apiRejectResetRequest,
  apiLogout,
} from '../api.js';
import { connectSocket, onAdminUserStatusChanged, onAdminDriverStatusChanged, onAdminDocumentStatusChanged, onAdminResetStatusChanged, disconnectSocket } from '../lib/socket.js';
import { BrandLoader } from '../components/BrandLoader.jsx';
import { formatCurrency, formatDateTime } from '../lib/format.js';

const STATUSES = ['pending', 'approved', 'rejected'];
const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'drivers', label: 'Drivers', icon: 'directions_car' },
  { id: 'users', label: 'Users', icon: 'people' },
  { id: 'rides', label: 'Rides', icon: 'history' },
  { id: 'documents', label: 'Documents', icon: 'description' },
  { id: 'reset-requests', label: 'Reset Requests', icon: 'lock_reset' },
];

// ─────────────────────────────────────────────────────────────
// Reusable UI Components
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const colors = {
    pending: 'bg-warning/15 text-warning border-warning/30',
    approved: 'bg-success/15 text-success border-success/30',
    rejected: 'bg-error/15 text-error border-error/30',
  };
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${sizeClasses[size]} ${colors[status] || 'bg-muted text-muted-foreground border-border'}`}
      role="status"
      aria-label={`Status: ${status}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RoleBadge({ role }) {
  const colors = {
    admin: 'bg-primary/15 text-primary border-primary/30',
    driver: 'bg-secondary/15 text-secondary border-secondary/30',
    passenger: 'bg-accent/15 text-accent border-accent/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${colors[role] || 'bg-muted text-muted-foreground border-border'}`}>
      {role}
    </span>
  );
}

function ActionButton({ children, onClick, disabled, variant = 'secondary', size = 'sm', 'aria-label': ariaLabel }) {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary',
    secondary: 'bg-muted text-muted-foreground hover:bg-muted/80 border-border',
    success: 'bg-success text-success-foreground hover:bg-success/90 border-success',
    error: 'bg-error text-error-foreground hover:bg-error/90 border-error',
    ghost: 'bg-transparent hover:bg-muted border-transparent',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}

function DataTable({ columns, data, keyExtractor, renderRow, emptyMessage = 'No data found', 'aria-label': ariaLabel }) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className="w-full text-sm" role="grid">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border font-medium">
            {columns.map((col) => (
              <th key={col.key} className="pb-3 px-3" scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item, index) => renderRow(item, index))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, icon, color, trend }) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border transition-colors duration-150 hover:border-primary/50">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trend.positive ? 'text-success' : 'text-error'}`}>
              {trend.label}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg bg-${color}/15 text-${color} shrink-0`}>
          <span className="material-symbols-outlined text-xl" aria-hidden="true">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function FilterChips({ filters, activeFilter, onChange, allLabel = 'All' }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${activeFilter === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
      >
        {allLabel}
      </button>
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${activeFilter === filter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </button>
      ))}
    </div>
  );
}

function Toast({ message, type = 'success', onClose }) {
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };
  const colors = {
    success: 'bg-success text-success-foreground',
    error: 'bg-error text-error-foreground',
    warning: 'bg-warning text-warning-foreground',
    info: 'bg-primary text-primary-foreground',
  };
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 animate-slide-in ${colors[type]} px-4 py-3 rounded-lg shadow-lg border border-border flex items-center gap-3 max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <span className="material-symbols-outlined" aria-hidden="true">{icons[type]}</span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Render Row Helpers (defined outside component for performance)
// ─────────────────────────────────────────────────────────────

function renderDriverRow(driver, handleStatusUpdate) {
  return (
    <tr key={driver.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-3">
        <div className="font-medium text-foreground">{driver.fullname}</div>
        <div className="text-muted-foreground text-xs">{driver.email}</div>
      </td>
      <td className="py-3 px-3 text-foreground">
        <div className="font-mono text-sm">{driver.licenseNumber || '—'}</div>
      </td>
      <td className="py-3 px-3 text-foreground">
        <div>{driver.contactNumber || '—'}</div>
        <div className="text-muted-foreground text-xs">{driver.todaAssociation || 'No TODA'}</div>
      </td>
      <td className="py-3 px-3 text-foreground">
        <div>Plate: {driver.vehiclePlate || '—'}</div>
        <div className="text-muted-foreground text-xs">Trike: {driver.trikeNumber || '—'}</div>
      </td>
      <td className="py-3 px-3">
        <StatusBadge status={driver.status} size="md" />
      </td>
      <td className="py-3 px-3 text-foreground">
        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/30">
          {driver.documentCount} docs
        </span>
      </td>
      <td className="py-3 px-3">
        <div className="flex gap-1" role="group" aria-label={`Driver actions for ${driver.fullname}`}>
          {STATUSES.map((s) => (
            <ActionButton
              key={s}
              disabled={driver.status === s}
              onClick={() => handleStatusUpdate('driver', driver.userId, s)}
              variant={driver.status === s ? 'primary' : 'secondary'}
              size="sm"
              aria-label={`${s.charAt(0).toUpperCase() + s.slice(1)} ${driver.fullname}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </ActionButton>
          ))}
        </div>
      </td>
    </tr>
  );
}

function renderUserRow(u) {
  return (
    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-3">
        <div className="font-medium text-foreground">{u.fullname}</div>
        <div className="text-muted-foreground text-xs">{u.email}</div>
      </td>
      <td className="py-3 px-3">
        <RoleBadge role={u.role} />
      </td>
      <td className="py-3 px-3">
        <StatusBadge status={u.status} size="md" />
      </td>
      <td className="py-3 px-3 text-muted-foreground font-mono text-xs">
        {formatDateTime(u.createdAt)}
      </td>
    </tr>
  );
}

function renderRideRow(ride) {
  return (
    <tr key={ride.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-3 font-mono text-primary">#{ride.id}</td>
      <td className="py-3 px-3 text-foreground max-w-xs truncate">
        {ride.pickup} → {ride.dropoff}
      </td>
      <td className="py-3 px-3 font-semibold text-foreground">{formatCurrency(ride.fare)}</td>
      <td className="py-3 px-3">
        <StatusBadge status={ride.status} size="md" />
      </td>
      <td className="py-3 px-3 text-foreground">{ride.passenger}</td>
      <td className="py-3 px-3 text-foreground">{ride.driver || '—'}</td>
      <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{formatDateTime(ride.createdAt)}</td>
    </tr>
  );
}

function renderDocumentRow(doc, handleStatusUpdate) {
  const fileName = String(doc.filePath).split(/[\\/]/).pop();
  const viewUrl = `/uploads/${fileName}`;
  return (
    <div key={doc.id} className="bg-card rounded-xl p-4 border border-border" role="listitem">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium text-foreground">{doc.fullname} · {doc.email}</div>
          <div className="text-muted-foreground text-sm">{doc.docType} · {formatDateTime(doc.createdAt)}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={doc.status} size="md" />
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg bg-primary/15 text-primary text-sm font-medium border border-primary/30 hover:bg-primary/25 transition-colors"
          >
            View Document
          </a>
          {doc.status === 'pending' && (
            <div className="flex gap-2" role="group" aria-label={`Document actions for ${doc.fullname}`}>
              <ActionButton
                onClick={() => handleStatusUpdate('document', doc.id, 'approved')}
                variant="success"
                size="sm"
                aria-label={`Approve document for ${doc.fullname}`}
              >
                Approve
              </ActionButton>
              <ActionButton
                onClick={() => handleStatusUpdate('document', doc.id, 'rejected')}
                variant="error"
                size="sm"
                aria-label={`Reject document for ${doc.fullname}`}
              >
                Reject
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderResetRequestRow(req, handleResetRequest) {
  return (
    <div key={req.id} className="bg-card rounded-xl p-4 border border-border" role="listitem">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium text-foreground">{req.fullname} · {req.email}</div>
          <div className="text-muted-foreground text-sm">
            <RoleBadge role={req.role} /> · {formatDateTime(req.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={req.status} size="md" />
          {req.status === 'pending' && (
            <div className="flex gap-2" role="group" aria-label={`Reset request actions for ${req.fullname}`}>
              <ActionButton
                onClick={() => handleResetRequest(req.id, 'approve')}
                variant="success"
                size="sm"
                aria-label={`Approve reset request for ${req.fullname}`}
              >
                Approve
              </ActionButton>
              <ActionButton
                onClick={() => handleResetRequest(req.id, 'reject')}
                variant="error"
                size="sm"
                aria-label={`Reject reset request for ${req.fullname}`}
              >
                Reject
              </ActionButton>
            </div>
          )}
          {req.admin_note && (
            <span className="text-muted-foreground text-sm max-w-xs truncate" title={req.admin_note}>
              Note: {req.admin_note}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function renderPendingUserRow(u, handleStatusUpdate) {
  return (
    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
      <div className="min-w-0">
        <div className="font-medium text-foreground truncate">{u.fullname}</div>
        <div className="text-muted-foreground text-sm">{u.email} · <RoleBadge role={u.role} /></div>
      </div>
      <div className="flex gap-2 shrink-0">
        {STATUSES.filter((s) => s !== 'pending').map((s) => (
          <ActionButton
            key={s}
            onClick={() => handleStatusUpdate('user', u.id, s)}
            variant={s === 'approved' ? 'success' : 'error'}
            size="sm"
            aria-label={`${s.charAt(0).toUpperCase() + s.slice(1)} ${u.fullname}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </ActionButton>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [docFilter, setDocFilter] = useState(null);
  const [toast, setToast] = useState(null);

  // Socket.io connection for real-time updates
  const socketRef = useRef(null);

  // Column definitions for tables (moved before early return to satisfy Rules of Hooks)
  const driverColumns = useMemo(() => [
    { key: 'driver', label: 'Driver' },
    { key: 'license', label: 'License #' },
    { key: 'contact', label: 'Contact' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'status', label: 'Status' },
    { key: 'docs', label: 'Docs' },
    { key: 'actions', label: 'Actions' },
  ], []);

  const userColumns = useMemo(() => [
    { key: 'user', label: 'User' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'joined', label: 'Joined' },
  ], []);

  const rideColumns = useMemo(() => [
    { key: 'ride', label: 'Ride' },
    { key: 'route', label: 'Route' },
    { key: 'fare', label: 'Fare' },
    { key: 'status', label: 'Status' },
    { key: 'passenger', label: 'Passenger' },
    { key: 'driver', label: 'Driver' },
    { key: 'time', label: 'Time' },
  ], []);

  // Load data for active tab
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'overview': {
          const data = await apiAdminStats();
          setStats(data);
          break;
        }
        case 'drivers': {
          const data = await apiAdminDrivers();
          setDrivers(data.drivers);
          break;
        }
        case 'users': {
          const [allUsers, pending] = await Promise.all([
            apiAdminUsers(),
            apiAdminPendingUsers(),
          ]);
          setUsers(allUsers.users);
          setPendingUsers(pending.users);
          break;
        }
        case 'rides': {
          const data = await apiAdminRides();
          setRides(data.rides);
          break;
        }
        case 'documents': {
          const data = await apiAdminDocuments({ status: docFilter });
          setDocuments(data.documents);
          break;
        }
        case 'reset-requests': {
          const data = await apiAdminResetRequests();
          setResetRequests(data.requests);
          break;
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, docFilter]);

  // Connect to Socket.io for real-time admin updates
  useEffect(() => {
    const s = connectSocket();
    if (!s) {
      // No auth token available — cannot connect to Socket.io
      socketRef.current = null;
      setLoading(false);
      return;
    }
    socketRef.current = s;

    // Join admin room
    s.emit('join:admin', (ack) => {
      if (ack?.ok) {
        console.log('[AdminDashboard] Joined admin room for real-time updates');
      }
    });

    // Listen for user status changes (passengers and drivers)
    const unsubUserStatus = onAdminUserStatusChanged(s, (data) => {
      console.log('[AdminDashboard] User status changed:', data);
      // Update users list
      setUsers(prev => prev.map(u => u.id === data.id ? { ...u, status: data.status } : u));
      setPendingUsers(prev => prev.map(u => u.id === data.id ? { ...u, status: data.status } : u));
      // If driver, also update drivers list
      if (data.role === 'driver') {
        setDrivers(prev => prev.map(d => d.userId === data.id ? { ...d, status: data.status } : d));
      }
      // Reload stats if on overview
      if (activeTab === 'overview') {
        apiAdminStats().then(data => setStats(data)).catch(() => {});
      }
      showToast(`User ${data.id} status updated to ${data.status}`);
    });

    // Listen for driver status changes
    const unsubDriverStatus = onAdminDriverStatusChanged(s, (data) => {
      console.log('[AdminDashboard] Driver status changed:', data);
      setDrivers(prev => prev.map(d => d.id === data.id ? { ...d, status: data.status } : d));
      // Reload stats if on overview
      if (activeTab === 'overview') {
        apiAdminStats().then(data => setStats(data)).catch(() => {});
      }
      showToast(`Driver ${data.id} status updated to ${data.status}`);
    });

    // Listen for document status changes
    const unsubDocStatus = onAdminDocumentStatusChanged(s, (data) => {
      console.log('[AdminDashboard] Document status changed:', data);
      setDocuments(prev => prev.map(d => d.id === data.id ? { ...d, status: data.status } : d));
      // Reload stats if on overview
      if (activeTab === 'overview') {
        apiAdminStats().then(data => setStats(data)).catch(() => {});
      }
      showToast(`Document ${data.id} status updated to ${data.status}`);
    });

    // Listen for reset request status changes
    const unsubResetStatus = onAdminResetStatusChanged(s, (data) => {
      console.log('[AdminDashboard] Reset request status changed:', data);
      setResetRequests(prev => prev.map(r => r.id === data.id ? { ...r, status: data.status } : r));
      // Reload stats if on overview
      if (activeTab === 'overview') {
        apiAdminStats().then(data => setStats(data)).catch(() => {});
      }
      showToast(`Reset request ${data.id} ${data.status}`);
    });

    return () => {
      unsubUserStatus();
      unsubDriverStatus();
      unsubDocStatus();
      unsubResetStatus();
      try { s.emit('leave:admin'); } catch (_) {}
      disconnectSocket();
      socketRef.current = null;
    };
  }, [activeTab]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStatusUpdate = async (type, id, status) => {
    try {
      switch (type) {
        case 'driver':
          await apiSetDriverStatus(id, status);
          setDrivers((prev) => prev.map((d) => (d.userId === id ? { ...d, status } : d)));
          break;
        case 'user':
          await apiSetUserStatus(id, status);
          setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
          setPendingUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
          break;
        case 'document':
          await apiSetDocumentStatus(id, status);
          setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
          break;
      }
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} marked as ${status}.`);
    } catch (err) {
      showToast(err.message || `Failed to update ${type} status`, 'error');
    }
  };

  const handleResetRequest = async (id, action) => {
    try {
      if (action === 'approve') {
        await apiApproveResetRequest(id);
        setResetRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
        showToast('Password reset request approved.');
      } else {
        await apiRejectResetRequest(id);
        setResetRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)));
        showToast('Password reset request rejected.');
      }
    } catch (err) {
      showToast(err.message || `Failed to ${action} reset request`, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
      logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      logout();
      navigate('/admin/login', { replace: true });
    }
  };

  // Render functions
  const renderOverview = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-card rounded-xl p-5 border border-border animate-pulse">
                <div className="h-4 w-1/3 bg-muted rounded mb-2"></div>
                <div className="h-8 w-1/2 bg-muted rounded"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border animate-pulse">
              <div className="h-4 w-1/4 bg-muted rounded mb-4"></div>
              <div className="flex flex-wrap gap-3">
                {[1,2,3].map(i => <div key={i} className="h-8 w-24 bg-muted rounded"></div>)}
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border animate-pulse">
              <div className="h-4 w-1/4 bg-muted rounded mb-4"></div>
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-8 w-full bg-muted rounded"></div>)}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={stats.users?.passenger + stats.users?.driver + stats.users?.admin || 0}
            icon="people"
            color="primary"
          />
          <StatCard
            label="Drivers"
            value={stats.drivers?.pending + stats.drivers?.approved + stats.drivers?.rejected || 0}
            icon="directions_car"
            color="secondary"
          />
          <StatCard
            label="Rides"
            value={stats.rides?.pending + stats.rides?.accepted + stats.rides?.completed + stats.rides?.cancelled || 0}
            icon="history"
            color="accent"
          />
          <StatCard
            label="Documents"
            value={stats.documents?.pending + stats.documents?.approved + stats.documents?.rejected || 0}
            icon="description"
            color="error"
          />
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border">
            <h3 className="text-base font-semibold text-foreground mb-4">Driver Status Breakdown</h3>
            <div className="flex flex-wrap gap-3">
              {['pending', 'approved', 'rejected'].map((s) => (
                <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                  <StatusBadge status={s} size="sm" />
                  <span className="text-foreground font-medium">{stats.drivers?.[s] || 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="text-base font-semibold text-foreground mb-4">Ride Status Breakdown</h3>
            <div className="space-y-2">
              {['pending', 'accepted', 'completed', 'cancelled'].map((s) => (
                <div key={s} className="flex justify-between items-center px-2 py-2 rounded-lg bg-muted">
                  <span className="capitalize text-foreground">{s}</span>
                  <span className="font-semibold text-primary">{stats.rides?.[s] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDrivers = () => {
    if (loading) {
      return (
        <div className="overflow-x-auto" role="region" aria-label="Drivers list" tabIndex={0}>
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border font-medium">
                {driverColumns.map((col) => (
                  <th key={col.key} className="pb-3 px-3" scope="col">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border/50 animate-pulse">
                  {driverColumns.map((col, colIndex) => (
                    <td key={colIndex} className="py-3 px-3">
                      <div className={`h-4 bg-muted rounded ${colIndex === 0 ? 'w-32' : colIndex === 1 ? 'w-24' : colIndex === 5 ? 'w-40' : 'w-full'}`}></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <DataTable
        columns={driverColumns}
        data={drivers}
        keyExtractor={(d) => d.id}
        renderRow={(driver, index) => renderDriverRow(driver, handleStatusUpdate)}
        emptyMessage="No drivers found"
        aria-label="Drivers list"
      />
    );
  };

  const renderUsers = () => {
    if (loading) {
      return (
        <div className="space-y-6 animate-pulse">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="h-6 w-16 bg-muted rounded-full"></div>
            </div>
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="min-w-0">
                    <div className="h-4 w-40 bg-muted rounded"></div>
                    <div className="h-3 w-60 bg-muted rounded mt-1"></div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <div className="h-7 w-20 bg-muted rounded"></div>
                    <div className="h-7 w-20 bg-muted rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto" role="region" aria-label="All users list" tabIndex={0}>
            <table className="w-full text-sm" role="grid">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border font-medium">
                  {userColumns.map((col) => (
                    <th key={col.key} className="pb-3 px-3" scope="col">
                      <div className="h-4 w-20 bg-muted rounded"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5].map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border/50">
                    {userColumns.map((col, colIndex) => (
                      <td key={colIndex} className="py-3 px-3">
                        <div className={`h-4 bg-muted rounded ${colIndex === 0 ? 'w-32' : colIndex === 1 ? 'w-20' : 'w-24'}`}></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {/* Pending Users Section */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">Pending Approval</h3>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/15 text-primary border border-primary/30">
              {pendingUsers.length}
            </span>
          </div>
          {pendingUsers.length > 0 ? (
            <div className="space-y-2">
              {pendingUsers.map((u) => renderPendingUserRow(u, handleStatusUpdate))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No pending users</p>
          )}
        </div>

        {/* All Users Table */}
        <DataTable
          columns={userColumns}
          data={users}
          keyExtractor={(u) => u.id}
          renderRow={renderUserRow}
          emptyMessage="No users found"
          aria-label="All users list"
        />
      </div>
    );
  };

  const renderRides = () => {
    if (loading) {
      return (
        <div className="overflow-x-auto animate-pulse" role="region" aria-label="Rides list" tabIndex={0}>
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border font-medium">
                {rideColumns.map((col) => (
                  <th key={col.key} className="pb-3 px-3" scope="col">
                    <div className="h-4 w-20 bg-muted rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border/50">
                  {rideColumns.map((col, colIndex) => (
                    <td key={colIndex} className="py-3 px-3">
                      <div className={`h-4 bg-muted rounded ${colIndex === 0 ? 'w-16' : colIndex === 1 ? 'w-40' : colIndex === 2 ? 'w-24' : 'w-24'}`}></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <DataTable
        columns={rideColumns}
        data={rides}
        keyExtractor={(r) => r.id}
        renderRow={renderRideRow}
        emptyMessage="No rides found"
        aria-label="Rides list"
      />
    );
  };

  const renderDocuments = () => {
    if (loading) {
      return (
        <div className="space-y-4 animate-pulse">
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-16 bg-muted rounded-lg"></div>
            <div className="h-8 w-20 bg-muted rounded-lg"></div>
            <div className="h-8 w-20 bg-muted rounded-lg"></div>
            <div className="h-8 w-16 bg-muted rounded-lg"></div>
          </div>
          <div className="space-y-3" role="list" aria-label="Documents">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="h-4 w-60 bg-muted rounded mb-2"></div>
                    <div className="h-3 w-40 bg-muted rounded"></div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="h-6 w-24 bg-muted rounded"></div>
                    <div className="h-8 w-28 bg-muted rounded-lg"></div>
                    <div className="h-7 w-20 bg-muted rounded"></div>
                    <div className="h-7 w-20 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <FilterChips
          filters={['pending', 'approved', 'rejected']}
          activeFilter={docFilter}
          onChange={setDocFilter}
          allLabel="All"
        />

        <div className="space-y-3" role="list" aria-label="Documents">
          {documents.map((doc) => renderDocumentRow(doc, handleStatusUpdate))}
          {documents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">description</span>
              No documents found
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResetRequests = () => {
    if (loading) {
      return (
        <div className="space-y-3 animate-pulse" role="list" aria-label="Password reset requests">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="h-4 w-60 bg-muted rounded mb-1"></div>
                  <div className="h-3 w-40 bg-muted rounded"></div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="h-6 w-24 bg-muted rounded"></div>
                  <div className="h-7 w-20 bg-muted rounded"></div>
                  <div className="h-7 w-20 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3" role="list" aria-label="Password reset requests">
        {resetRequests.map((req) => renderResetRequestRow(req, handleResetRequest))}
        {resetRequests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">lock_reset</span>
            No password reset requests
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'drivers': return renderDrivers();
      case 'users': return renderUsers();
      case 'rides': return renderRides();
      case 'documents': return renderDocuments();
      case 'reset-requests': return renderResetRequests();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">admin_panel_settings</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground tracking-tight">Fairtrike Admin</h1>
                <p className="text-muted-foreground text-xs">Operations Console</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:block">
                Signed in as <span className="font-medium text-foreground">{user?.fullname}</span>
              </span>
              <ActionButton
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                aria-label="Sign out"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">logout</span>
                <span className="hidden sm:inline">Sign Out</span>
              </ActionButton>
            </div>
          </div>

          {/* Tabs */}
          <nav className="h-12 overflow-x-auto" aria-label="Admin sections" role="tablist">
            <div className="flex gap-1 min-w-max" role="tablist">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-full mx-auto px-4 py-6">
        <div id="main-content" role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="animate-fade-in">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;