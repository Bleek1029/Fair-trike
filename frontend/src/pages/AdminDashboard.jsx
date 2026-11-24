// ── Admin Dashboard ───────────────────────────────────────
// Fairtrike Operations Console - Full admin management interface
// Design System: Modern admin UI (fixed header, metric banner, fleet registry table,
// realtime audit feed, TODA quota card) — styled with Tailwind via design-update.css
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
  apiAiSummary,
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
            href={doc.filePath}
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
  const [activeTab, setActiveTab] = useState('drivers');
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
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

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

  // Generate AI executive summary from the latest admin stats
  const generateAiSummary = useCallback(async (context) => {
    setAiSummaryLoading(true);
    try {
      const summary = await apiAiSummary('admin', context);
      setAiSummary(summary.summary || '');
    } catch (err) {
      console.error('AI summary failed:', err);
      setAiSummary('Unable to generate executive summary at this time.');
    } finally {
      setAiSummaryLoading(false);
    }
  }, []);

  // Load data for active tab
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'overview': {
          const data = await apiAdminStats();
          setStats(data);
          await generateAiSummary(data);
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

  const totalDrivers = (stats.drivers?.pending || 0) + (stats.drivers?.approved || 0) + (stats.drivers?.rejected || 0);

  // Render driver table rows (used by the Drivers tab)
  const renderDriverRows = () => {
    if (loading) {
      return (
        <>
          {[1, 2, 3, 4, 5].map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/50 animate-pulse">
              <td className="py-3 px-space-lg"><div className="h-8 bg-muted rounded animate-pulse"></div></td>
              <td className="py-3 px-space-md"><div className="h-6 bg-muted rounded animate-pulse"></div></td>
              <td className="py-3 px-space-md"><div className="h-6 bg-muted rounded animate-pulse"></div></td>
              <td className="py-3 px-space-md"><div className="h-6 bg-muted rounded animate-pulse"></div></td>
              <td className="py-3 px-space-md text-center"><div className="h-6 bg-muted rounded animate-pulse"></div></td>
              <td className="py-3 px-space-md text-center"><div className="h-6 bg-muted rounded animate-pulse"></div></td>
              <td className="py-3 px-space-lg text-right"><div className="h-6 bg-muted rounded animate-pulse"></div></td>
            </tr>
          ))}
        </>
      );
    }
    return drivers.map((driver) => renderDriverRow(driver, handleStatusUpdate));
  };

  // Render functions for each tab
  const renderOverview = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
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
                {[1, 2, 3].map((i) => <div key={i} className="h-8 w-24 bg-muted rounded"></div>)}
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border animate-pulse">
              <div className="h-4 w-1/4 bg-muted rounded mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 w-full bg-muted rounded"></div>)}
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

        {/* AI-Generated Executive Summary */}
        {(aiSummary || aiSummaryLoading) && (
          <div className="bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">AI Executive Summary</h3>
                <p className="text-xs text-muted-foreground">
                  Generated by Gemini &bull; {aiSummaryLoading ? 'Generating…' : 'Latest'}
                </p>
              </div>
              {!aiSummaryLoading && (
                <button
                  type="button"
                  onClick={() => {
                    if (stats) void generateAiSummary(stats);
                  }}
                  disabled={aiSummaryLoading}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Refresh
                </button>
              )}
            </div>
            {aiSummaryLoading ? (
              <div className="h-12 flex items-center justify-center">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">{aiSummary}</p>
            )}
          </div>
        )}

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

  const renderDriversTab = () => (
    <>
      {/* Main Table Section & Filter Deck */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Header & Controls Bar */}
        <div className="p-space-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md bg-surface-container-lowest">
          <div>
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-md text-headline-md text-on-surface">Driver Fleet Registry</h1>
              <span className="font-telemetry-code text-telemetry-code bg-surface-container-low text-primary px-2.5 py-0.5 rounded-full font-semibold">SEC-NCR-402</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Manage operator accreditation, municipal tricycle franchises, and document verification records.</p>
          </div>
          {/* Action Utilities */}
          <div className="flex items-center flex-wrap gap-space-sm">
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Export CSV</span>
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>Columns</span>
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm font-label-md text-label-md">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Enroll Driver</span>
            </button>
          </div>
        </div>
        {/* Search & Filter Controls */}
        <div className="px-space-lg py-space-md bg-surface-container-low/40 flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary transition-all shadow-xs" id="driverSearchInput" placeholder="Search by driver name, license, contact, or plate (e.g. TRIKE-PC-012)..." type="text" />
            <button className="hidden absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface" id="clearSearchBtn">
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          </div>
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" id="filterChipsContainer">
            <button className="filter-chip px-3 py-1.5 rounded-lg font-label-sm text-label-sm uppercase tracking-wider transition-all bg-primary text-on-primary font-semibold shadow-xs" data-filter="all">
              All ({totalDrivers})
            </button>
            <button className="filter-chip px-3 py-1.5 rounded-lg font-label-sm text-label-sm uppercase tracking-wider transition-all bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container font-semibold shadow-xs" data-filter="approved">
              Approved ({stats.drivers?.approved || 0})
            </button>
            <button className="filter-chip px-3 py-1.5 rounded-lg font-label-sm text-label-sm uppercase tracking-wider transition-all bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container font-semibold shadow-xs" data-filter="pending">
              Pending ({stats.drivers?.pending || 0})
            </button>
            <button className="filter-chip px-3 py-1.5 rounded-lg font-label-sm text-label-sm uppercase tracking-wider transition-all bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container font-semibold shadow-xs" data-filter="rejected">
              Rejected ({stats.drivers?.rejected || 0})
            </button>
          </div>
        </div>
        {/* Drivers Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left font-body-md text-body-md">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider select-none">
                <th className="py-3 px-space-lg font-semibold">Driver Details</th>
                <th className="py-3 px-space-md font-semibold">License #</th>
                <th className="py-3 px-space-md font-semibold">Contact &amp; TODA</th>
                <th className="py-3 px-space-md font-semibold">Vehicle &amp; Unit</th>
                <th className="py-3 px-space-md font-semibold text-center">Status</th>
                <th className="py-3 px-space-md font-semibold text-center">Docs</th>
                <th className="py-3 px-space-lg font-semibold text-right">Quick Decision</th>
              </tr>
            </thead>
            <tbody className="bg-surface-container-lowest" id="driverTableBody">
              {renderDriverRows()}
            </tbody>
          </table>
        </div>
        {/* Table Footer with Pagination Controls */}
        <div className="p-space-md bg-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Showing <strong className="font-semibold text-on-surface" id="visibleRowCount">{drivers.length}</strong> of <strong className="font-semibold text-on-surface">{totalDrivers}</strong> registered drivers</span>
            <span className="inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="font-label-sm text-label-sm text-secondary font-semibold">Sync: LGU Pasay TODA Matrix</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm flex items-center gap-1 shadow-xs disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              <span>Previous</span>
            </button>
            <button className="w-8 h-8 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-semibold flex items-center justify-center shadow-xs">
              1
            </button>
            <button className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center justify-center shadow-xs">
              2
            </button>
            <button className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center justify-center shadow-xs">
              3
            </button>
            <span className="px-1 text-on-surface-variant font-label-sm text-label-sm">…</span>
            <button className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center justify-center shadow-xs">
              29
            </button>
            <button className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center gap-1 shadow-xs">
              <span>Next</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Realtime Verification & Audit Log Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mt-space-lg">
        {/* Audit Feed */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Recent Regulatory Verifications</h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Live Audit Sync</span>
            </div>
            <div className="space-y-space-sm">
              <div className="flex items-start justify-between p-space-sm rounded-lg bg-surface-container-low/50">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
                  <div>
                    <span className="font-headline-sm text-body-md font-semibold text-on-surface block">LTO Franchise Match • TRIKE-PC-012</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Eduardo Santos validated via LGU Pasay Central Database API</span>
                  </div>
                </div>
                <span className="font-telemetry-code text-body-sm text-on-surface-variant">2 mins ago</span>
              </div>
              <div className="flex items-start justify-between p-space-sm rounded-lg bg-surface-container-low/50">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-error text-[20px]">cancel</span>
                  <div>
                    <span className="font-headline-sm text-body-md font-semibold text-on-surface block">NBI Clearance Flag • TRIKE-MC-055</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Danilo Reyes clearance record expired beyond 60-day renewal grace</span>
                  </div>
                </div>
                <span className="font-telemetry-code text-body-sm text-on-surface-variant">14 mins ago</span>
              </div>
              <div className="flex items-start justify-between p-space-sm rounded-lg bg-surface-container-low/50">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-secondary-container text-[20px]">upload_file</span>
                  <div>
                    <span className="font-headline-sm text-body-md font-semibold text-on-surface block">Barangay Clearance Uploaded</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Rodrigo Dela Cruz uploaded revised San Antonio barangay cert</span>
                  </div>
                </div>
                <span className="font-telemetry-code text-body-sm text-on-surface-variant">41 mins ago</span>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span>Automatic biometric and municipal franchise cross-referencing active.</span>
            <a className="text-secondary font-semibold hover:underline flex items-center gap-1" href="#">
              <span>View All 124 Audits</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </div>
        </div>
        {/* Quick Dispatch Summary & Toda Distribution Mini-Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">TODA Sector Quota</h2>
              <span className="font-telemetry-code text-label-sm text-on-secondary-container bg-secondary-container/40 px-2 py-0.5 rounded-full font-bold">PASAY CITY</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between font-label-sm text-label-sm mb-1">
                  <span className="font-medium text-on-surface">Poblacion Central TODA</span>
                  <span className="font-telemetry-code text-on-surface-variant">112 / 120 (93%)</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '93%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between font-label-sm text-label-sm mb-1">
                  <span className="font-medium text-on-surface">San Antonio TODA</span>
                  <span className="font-telemetry-code text-on-surface-variant">88 / 100 (88%)</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between font-label-sm text-label-sm mb-1">
                  <span className="font-medium text-on-surface">Malibay Proper TODA</span>
                  <span className="font-telemetry-code text-on-surface-variant">74 / 90 (82%)</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className="bg-secondary-fixed-dim h-full rounded-full" style={{ width: '82%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between font-label-sm text-label-sm mb-1">
                  <span className="font-medium text-on-surface">Maricaban Sector TODA</span>
                  <span className="font-telemetry-code text-on-surface-variant">74 / 110 (67%)</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className="bg-outline-variant h-full rounded-full" style={{ width: '67%' }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-space-md p-space-sm bg-surface-container-low rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              <span className="font-label-sm text-label-sm text-on-surface font-semibold">TODA Cap Compliance</span>
            </div>
            <span className="font-telemetry-code text-label-sm text-secondary font-bold">98.2%</span>
          </div>
        </div>
      </div>
    </>
  );

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
              {[1, 2, 3].map((i) => (
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
                {[1, 2, 3, 4, 5].map((_, rowIndex) => (
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
              {[1, 2, 3, 4, 5].map((_, rowIndex) => (
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
            {[1, 2, 3, 4].map((i) => (
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
          {[1, 2, 3].map((i) => (
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
      case 'drivers': return renderDriversTab();
      case 'users': return renderUsers();
      case 'rides': return renderRides();
      case 'documents': return renderDocuments();
      case 'reset-requests': return renderResetRequests();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-28 w-full px-margin flex flex-col justify-between pt-3 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-md">
              <div className="p-1.5 rounded-lg bg-surface-container-low flex items-center justify-center">
                <img alt="logo-final-check.png" className="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/ALJJyrBz0zthyrXv9HWUD7OLdTH4n8sw271oie4dGEnMwszWMr3w0C8rhuX9f5Xk4WVYvEMAorx0mqXjIlBFVFFgSf3ib2_IAB5DWtm6i_ymYmUxnc06eIYf4XnYqx1M2LkdZENlnh0cvthQlRZzUg8NTeuUcvpcEHCgx70rvtEsAOld-VVTQMhbMlCDqbLApphFkIiWWQGYqPn40gIOsAP6c_AuwJcFtTbuI7CWdJIRCt7N-j6Y9QdQqtGRsw" />
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight block">Fairtrike Admin</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">Operations Console</span>
              </div>
            </div>
            <div className="flex items-center gap-space-lg">
              <div className="flex items-center gap-space-sm bg-surface-container-low px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span className="font-label-md text-label-md text-on-surface">Signed in as <strong className="font-semibold">{user?.fullname}</strong></span>
              </div>
              <ActionButton
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                aria-label="Sign out"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
                <span>Sign Out</span>
              </ActionButton>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-space-xl overflow-x-auto" aria-label="Admin sections" role="tablist">
            {TAB_CONFIG.map((tab) => (
              <a
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                className={`pb-2.5 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-primary font-headline-sm border-b-2 border-primary' : 'font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface'}`}
              >
                {tab.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="w-full pt-28 bg-surface min-h-screen relative px-margin">
        <div className="flex flex-col w-full pb-space-xl">
          {/* Metric Quick Rollout & Dispatch Telemetry Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-space-lg pt-space-md">
            {/* Stat 1 */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Enrolled</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">electric_rickshaw</span>
                </div>
              </div>
              <div className="mt-space-sm flex items-baseline justify-between">
                <span className="font-telemetry-metric text-telemetry-metric text-on-surface">{totalDrivers}</span>
                <span className="font-label-md text-label-md text-secondary font-semibold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>+12.4%
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">Across 8 TODA sectors</span>
            </div>
            {/* Stat 2 */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Approved Drivers</span>
                <div className="w-8 h-8 rounded-lg bg-secondary-container/30 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
              </div>
              <div className="mt-space-sm flex items-baseline justify-between">
                <span className="font-telemetry-metric text-telemetry-metric text-on-surface">{stats.drivers?.approved || 0}</span>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container font-semibold">
                  {totalDrivers > 0 ? Math.round((stats.drivers?.approved || 0) / totalDrivers * 100) : 0}% Active
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">Verified LTO &amp; Franchise</span>
            </div>
            {/* Stat 3 */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Pending Review</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                </div>
              </div>
              <div className="mt-space-sm flex items-baseline justify-between">
                <span className="font-telemetry-metric text-telemetry-metric text-on-surface">{stats.drivers?.pending || 0}</span>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-semibold animate-pulse">Needs Review</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">Avg turnaround: 3.2 hrs</span>
            </div>
            {/* Stat 4 */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Compliance Disqualified</span>
                <div className="w-8 h-8 rounded-lg bg-error-container/40 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-[18px]">gavel</span>
                </div>
              </div>
              <div className="mt-space-sm flex items-baseline justify-between">
                <span className="font-telemetry-metric text-telemetry-metric text-on-surface">{stats.drivers?.rejected || 0}</span>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-semibold">
                  {totalDrivers > 0 ? Math.round((stats.drivers?.rejected || 0) / totalDrivers * 100) : 0}%
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">Expired permits / Violations</span>
            </div>
          </div>

          {/* Tab Content */}
          <div id="main-content" role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="animate-fade-in">
            {renderTabContent()}
          </div>
        </div>
      </main>
      <div className="fixed bottom-margin right-margin z-40">
        <button className="flex items-center gap-2 px-space-md py-2.5 bg-primary-container text-on-primary shadow-[0_12px_24px_-4px_rgba(6,78,59,0.2),0_6px_12px_-3px_rgba(15,23,42,0.08)] rounded-xl font-label-lg text-label-lg hover:bg-primary transition-all duration-200 transform hover:-translate-y-0.5">
          <span className="material-symbols-outlined text-[20px]">download_for_offline</span>
          <span>Install App</span>
        </button>
      </div>
      <footer className="w-full bg-surface-container-low py-space-md">
        <div className="w-full px-margin flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
          <span>Fairtrike Operations Command • Version 2.4.0-prod</span>
          <span>© 2025 Fairtrike Mobility Network. All dispatch telemetries authenticated.</span>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;
