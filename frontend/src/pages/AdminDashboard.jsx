// Admin console — sidebar navigation with smooth animations.
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiAdminStats, apiAdminDrivers } from '../api.js';
import { apiSetDriverStatus, apiAdminRides } from '../api.js';
import { apiAdminResetRequests, apiApproveResetRequest, apiRejectResetRequest } from '../api.js';
import { apiAdminPendingUsers, apiSetUserStatus, apiAdminDocuments, apiAdminUsers } from '../api.js';
import { apiAdminDeleteAllDrivers, apiAdminDeleteAllUsers, apiAdminDeleteAllResetRequests, apiAdminDeleteAllDocuments } from '../api.js';
import { apiAiSummary } from '../api.js';
import { AdminHeader } from '../components/Chrome.jsx';
import { Footer } from '../components/Footer.jsx';
import { Icon } from '../components/Icon.jsx';
import { connectSocket, joinAdmin, onAdminUserCreated, onAdminDriverCreated, onAdminUserStatusChanged, onAdminDriverStatusChanged, onAdminResetRequested, onAdminResetStatusChanged, onAdminDocumentCreated, onAdminDocumentStatusChanged } from '../lib/socket.js';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard', badge: null },
  { id: 'drivers', label: 'Drivers', icon: 'two_wheeler', badge: 'drivers' },
  { id: 'users', label: 'User Approvals', icon: 'person_add', badge: 'users' },
  { id: 'resets', label: 'Password Resets', icon: 'lock_reset', badge: 'resets' },
  { id: 'rides', label: 'Rides', icon: 'local_taxi', badge: null },
  { id: 'documents', label: 'Documents', icon: 'description', badge: null },
];

const statusColors = {
  pending: 'bg-warning-container text-on-warning-container',
  approved: 'bg-tertiary-container text-on-tertiary-container',
  rejected: 'bg-error-container text-on-error-container',
};

const roleIcons = {
  passenger: 'person',
  driver: 'two_wheeler',
  admin: 'shield_person',
};

function StatusBadge({ status, className = '' }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[status] || 'bg-surface-container-high text-on-surface-variant'} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RoleBadge({ role, className = '' }) {
  const icon = roleIcons[role] || 'person';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant ${className}`}>
      <Icon name={icon} size={12} />
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function ActionButton({ children, onClick, disabled, variant = 'primary', loading = false, icon }) {
  const baseClasses = 'inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg font-bold transition-all duration-200';
  const variants = {
    primary: 'bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-error-container text-error hover:bg-error hover:text-on-error active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    warning: 'bg-warning-container text-on-warning-container hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-on-surface hover:bg-surface-container-high active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]}`}
    >
      {loading && <Icon name="sync" size={16} className="animate-spin" />}
      {icon && !loading && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

function AnimatedRow({ children, isExiting, isEntering, style, className = '' }) {
  const baseStyle = {
    ...style,
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isEntering ? 0 : isExiting ? 0 : 1,
    transform: isEntering ? 'translateX(-20px)' : isExiting ? 'translateX(20px) scale(0.95)' : 'none',
    pointerEvents: isExiting ? 'none' : 'auto',
  };

  return (
    <div
      className={className}
      style={baseStyle}
    >
      {children}
    </div>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-4">
        <Icon name={icon} size={28} className="text-on-surface-variant/60" />
      </div>
      <h3 className="text-title-md font-bold mb-1">{title}</h3>
      <p className="text-body-sm text-secondary max-w-xs mb-4">{description}</p>
      {action && (
        <ActionButton variant="primary" onClick={action.onClick} icon={action.icon}>
          {action.label}
        </ActionButton>
      )}
    </div>
  );
}

function SectionHeader({ title, count, icon, action, deleteAllAction }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center">
          <Icon name={icon} size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-title-md font-bold">{title}</h2>
          <p className="text-body-sm text-secondary">{count} {count === 1 ? 'item' : 'items'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {deleteAllAction && (
          <ActionButton variant="danger" onClick={deleteAllAction.onClick} icon={deleteAllAction.icon}>
            {deleteAllAction.label}
          </ActionButton>
        )}
        {action && <ActionButton variant="ghost" onClick={action.onClick} icon={action.icon}>{action.label}</ActionButton>}
      </div>
    </div>
  );
}

function DeleteAllModal({ isOpen, onClose, title, description, itemCount, onConfirm, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-5 border-b border-surface-container-high">
          <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center flex-shrink-0">
            <Icon name="delete_forever" size={28} className="text-error" />
          </div>
          <div>
            <h2 id="delete-modal-title" className="text-title-md font-bold text-on-surface">{title}</h2>
            <p className="text-body-sm text-secondary mt-0.5">{description}</p>
          </div>
        </div>
        <div className="p-5">
          <div className="bg-error-container/10 border border-error-container rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-body-md font-medium text-on-surface">Items to be deleted:</span>
              <span className="text-headline-md font-bold text-error">{itemCount}</span>
            </div>
            <p className="text-body-xs text-error mt-2">This action cannot be undone. All data will be permanently removed.</p>
          </div>
          <div className="flex gap-3">
            <ActionButton variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </ActionButton>
            <ActionButton variant="danger" onClick={onConfirm} className="flex-1" loading={loading} icon="delete_forever">
              Delete All
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // All users for the Users tab
  const [allDrivers, setAllDrivers] = useState([]); // All drivers for the Drivers tab
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [exitingIds, setExitingIds] = useState(new Set());
  const [enteringIds, setEnteringIds] = useState(new Set());
  const [activeNav, setActiveNav] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default

  // Users tab filter
  const [userFilter, setUserFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'

  // Drivers tab filter
  const [driverFilter, setDriverFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'

  // Delete All Modal state
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'drivers'|'users'|'resets'|'documents', count: number }
  const [deleteLoading, setDeleteLoading] = useState(false);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // Load function - defined first to avoid temporal dead zone issues
  const load = useCallback(async () => {
    setError('');
    try {
      const s = await apiAdminStats();
      const d = await apiAdminDrivers();
      const r = await apiAdminRides();
      const rr = await apiAdminResetRequests();
      const pu = await apiAdminPendingUsers();
      const au = await apiAdminUsers(); // Fetch all users
      const docs = await apiAdminDocuments();
      setStats(s);
      setDrivers(d.drivers || []);
      setAllDrivers(d.drivers || []); // Store all drivers for filtering
      setRides(r.rides || []);
      setResetRequests(rr.requests || []);
      setPendingUsers(pu.users || []);
      setAllUsers(au.users || []);
      setDocuments(docs.documents || []);

      const newIds = new Set([
        ...(d.drivers || []).map(x => `driver-${x.userId ?? x.id}`),
        ...(rr.requests || []).map(x => `reset-${x.id}`),
        ...(pu.users || []).map(x => `user-${x.id}`),
      ]);
      setEnteringIds(newIds);
      setTimeout(() => setEnteringIds(new Set()), 300);

      // Generate AI summary after stats load
      if (s) {
        generateAiSummary(s);
      }
    } catch (e) { setError(e.message); }
  }, []);

  // Generate AI summary for admin dashboard
  const generateAiSummary = useCallback(async (statsData) => {
    setAiSummaryLoading(true);
    try {
      const summary = await apiAiSummary('admin', statsData);
      setAiSummary(summary.summary || '');
    } catch (e) {
      console.error('AI summary failed:', e);
      setAiSummary('Unable to generate AI summary at this time.');
    } finally {
      setAiSummaryLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      load();
    }, refreshInterval);
    return () => clearInterval(id);
  }, [autoRefresh, refreshInterval, load]);

  // Real-time socket connection for admin updates
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const socket = connectSocket();
    joinAdmin(socket);

    // Listen for real-time admin events
    const unsubUserCreated = onAdminUserCreated(socket, (newUser) => {
      setAllUsers(prev => [newUser, ...prev]);
      if (newUser.role === 'driver') {
        setAllDrivers(prev => [newUser, ...prev]);
      } else {
        setPendingUsers(prev => [newUser, ...prev]);
      }
      setStats(prev => prev ? { ...prev, users: { ...prev.users, [newUser.role]: (prev.users[newUser.role] || 0) + 1 } } : null);
    });

    const unsubDriverCreated = onAdminDriverCreated(socket, (driver) => {
      // Driver is created with user info
      const newDriver = { ...driver, user: driver.user || driver };
      setAllDrivers(prev => [newDriver, ...allDrivers]);
      setStats(prev => prev ? { ...prev, drivers: { ...prev.drivers, pending: (prev.drivers.pending || 0) + 1 } } : null);
    });

    const unsubUserStatusChanged = onAdminUserStatusChanged(socket, (updatedUser) => {
      setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setPendingUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, status: updatedUser.status } : u));
    });

    const unsubDriverStatusChanged = onAdminDriverStatusChanged(socket, (driver) => {
      setAllDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, ...driver } : d));
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, ...driver } : d));
    });

    const unsubResetRequested = onAdminResetRequested(socket, (request) => {
      setResetRequests(prev => [request, ...prev]);
    });

    const unsubResetStatusChanged = onAdminResetStatusChanged(socket, (request) => {
      setResetRequests(prev => prev.map(r => r.id === request.id ? request : r));
    });

    const unsubDocumentCreated = onAdminDocumentCreated(socket, (doc) => {
      setDocuments(prev => [doc, ...documents]);
    });

    const unsubDocumentStatusChanged = onAdminDocumentStatusChanged(socket, (doc) => {
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, ...doc } : d));
    });

    return () => {
      unsubUserCreated();
      unsubDriverCreated();
      unsubUserStatusChanged();
      unsubDriverStatusChanged();
      unsubResetRequested();
      unsubResetStatusChanged();
      unsubDocumentCreated();
      unsubDocumentStatusChanged();
    };
  }, [user]);

  const openDeleteModal = (type) => {
    const counts = {
      drivers: drivers.length,
      users: pendingUsers.length,
      resets: resetRequests.length,
      documents: documents.length,
    };
    setDeleteModal({ type, count: counts[type] });
  };

  const closeDeleteModal = () => setDeleteModal(null);

  const confirmDeleteAll = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      switch (deleteModal.type) {
        case 'drivers':
          await apiAdminDeleteAllDrivers();
          break;
        case 'users':
          await apiAdminDeleteAllUsers();
          break;
        case 'resets':
          await apiAdminDeleteAllResetRequests();
          break;
        case 'documents':
          await apiAdminDeleteAllDocuments();
          break;
      }
      await load();
      closeDeleteModal();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAction = async (id, actionFn, type) => {
    const fullId = `${type}-${id}`;
    setBusy(id);
    setExitingIds(prev => new Set(prev).add(fullId));

    await new Promise(r => setTimeout(r, 200));

    try {
      await actionFn();
      await load();
    } catch (e) {
      setError(e.message);
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(fullId);
        return next;
      });
    } finally {
      setBusy(null);
    }
  };

  const approveReset = (id) => handleAction(id, () => apiApproveResetRequest(id, { admin_note: 'Approved by admin' }), 'reset');
  const rejectReset = (id) => handleAction(id, () => apiRejectResetRequest(id, { admin_note: 'Rejected by admin' }), 'reset');
  const approve = (uid, status) => handleAction(uid, () => apiSetDriverStatus(uid, status), 'driver');
  const approveUser = (uid, status) => handleAction(uid, () => apiSetUserStatus(uid, status), 'user');
  const setDocStatus = (id, status) => handleAction(id, () => apiSetDocumentStatus(id, status), 'doc');

  useEffect(() => { load(); }, [load]);

  const total = (o) => Object.values(o || {}).reduce((a, n) => a + Number(n || 0), 0);

  const getPendingCount = (type) => {
    switch (type) {
      case 'drivers': return drivers.filter(d => d.status === 'pending').length;
      case 'users': return pendingUsers.length;
      case 'resets': return resetRequests.filter(r => r.status === 'pending').length;
      case 'documents': return documents.filter(d => d.status === 'pending').length;
      default: return 0;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Overview" count="" icon="dashboard" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: total(stats?.users), icon: 'person', color: 'bg-primary-container text-on-primary-container', trend: '+12%' },
          { label: 'Total Drivers', value: total(stats?.drivers), icon: 'two_wheeler', color: 'bg-tertiary-container text-on-tertiary-container', trend: '+5%' },
          { label: 'Total Rides', value: total(stats?.rides), icon: 'local_taxi', color: 'bg-secondary-container text-on-secondary-container', trend: '+23%' },
          { label: 'Pending Docs', value: stats?.documents?.pending ?? 0, icon: 'description', color: 'bg-warning-container text-on-warning-container', trend: null },
        ].map((stat, i) => (
          <div key={stat.label} className="rounded-2xl bg-surface-container-low p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-surface-container-high/50" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <Icon name={stat.icon} size={24} />
              </div>
              {stat.trend && <span className="text-body-xs font-bold bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded-full">{stat.trend}</span>}
            </div>
            <p className="text-headline-lg font-bold text-on-surface">{stat.value}</p>
            <p className="text-label-sm text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* AI-Generated Executive Summary */}
      {(aiSummary || aiSummaryLoading) && (
        <div className="rounded-2xl bg-primary-container/10 border border-primary-container/30 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
              <Icon name="auto_awesome" size={22} className="text-primary" />
            </div>
            <div>
              <h3 className="text-title-sm font-bold">AI Executive Summary</h3>
              <p className="text-body-xs text-secondary">Generated by Gemini • {aiSummaryLoading ? 'Generating…' : 'Latest'}</p>
            </div>
            {!aiSummaryLoading && (
              <button
                type="button"
                onClick={() => generateAiSummary(stats)}
                disabled={aiSummaryLoading}
                className="ml-auto px-3 py-1.5 rounded-lg text-body-xs font-bold bg-primary text-on-primary hover:shadow-lg transition-all disabled:opacity-50"
              >
                Refresh
              </button>
            )}
          </div>
          {aiSummaryLoading ? (
            <div className="h-12 flex items-center justify-center">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            <p className="text-body-md text-on-surface whitespace-pre-wrap">{aiSummary}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-surface-container-low p-5 shadow-sm border border-surface-container-high/50 lg:col-span-2">
          <h3 className="text-title-sm font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionButton variant="primary" icon="person_add" onClick={() => setActiveNav('users')}>Approve Users</ActionButton>
            <ActionButton variant="primary" icon="two_wheeler" onClick={() => setActiveNav('drivers')}>Verify Drivers</ActionButton>
            <ActionButton variant="warning" icon="lock_reset" onClick={() => setActiveNav('resets')}>Review Resets</ActionButton>
            <ActionButton variant="ghost" icon="description" onClick={() => setActiveNav('documents')}>Check Documents</ActionButton>
          </div>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-5 shadow-sm border border-surface-container-high/50">
          <h3 className="text-title-sm font-bold mb-4">System Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Database', status: 'online', detail: 'PostgreSQL connected' },
              { label: 'API Server', status: 'online', detail: 'Port 5000 active' },
              { label: 'WebSocket', status: 'online', detail: 'Socket.io running' },
              { label: 'Admin Server', status: 'online', detail: 'Port 5001 proxy' },
            ].map((sys, i) => (
              <div key={sys.label} className="flex items-center justify-between py-2 border-t border-surface-container-high/50 first:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${sys.status === 'online' ? 'bg-tertiary' : 'bg-error'}`} />
                  <span className="font-medium">{sys.label}</span>
                </div>
                <span className="text-body-xs text-secondary">{sys.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDrivers = () => {
    // Filter drivers based on selected filter
    const filteredDrivers = driverFilter === 'all'
      ? allDrivers
      : allDrivers.filter(d => d.status === driverFilter);

    const displayTitle = driverFilter === 'all' ? 'All Drivers' : `Driver Verification - ${driverFilter.charAt(0).toUpperCase() + driverFilter.slice(1)}`;
    const displayCount = driverFilter === 'all' ? allDrivers.length : filteredDrivers.length;

    return (
      <div className="animate-fade-in">
        <SectionHeader
          title={displayTitle}
          count={displayCount}
          icon="two_wheeler"
          action={{ label: 'Refresh', icon: 'refresh', onClick: load }}
          deleteAllAction={drivers.length > 0 && driverFilter === 'pending' ? { label: 'Delete All', icon: 'delete_forever', onClick: () => openDeleteModal('drivers') } : null}
        />

        {/* Filter dropdown */}
        <div className="mb-4 flex items-center gap-2">
          <label className="text-body-sm text-secondary">Filter:</label>
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>

        {filteredDrivers.length === 0 ? (
          <EmptyState
            icon="two_wheeler"
            title={driverFilter === 'all' ? 'No Drivers' : `No ${driverFilter.charAt(0).toUpperCase() + driverFilter.slice(1)} Drivers`}
            description={driverFilter === 'all'
              ? 'No driver applications found.'
              : `No drivers with status "${driverFilter}" found.`}
          />
        ) : (
          <div className="space-y-2" role="list">
            {filteredDrivers.map((d) => {
              const id = d.userId ?? d.id;
              const fullId = `driver-${id}`;
              const isEntering = enteringIds.has(fullId);
              const isExiting = exitingIds.has(fullId);
              const isBusy = busy === id;

              // Only show approve/reject buttons for pending drivers
              const showActions = d.status === 'pending';

              return (
                <AnimatedRow
                  key={fullId}
                  isEntering={isEntering}
                  isExiting={isExiting}
                  className="group"
                >
                  <div className="flex items-center gap-4 py-4 px-4 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors border border-surface-container-high/50" role="listitem">
                    <div className="w-14 h-14 rounded-xl bg-tertiary-container flex items-center justify-center flex-shrink-0">
                      <Icon name="two_wheeler" size={24} className="text-tertiary" />
                    </div>
                    <div className="grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold truncate">{d.fullname}</p>
                        <RoleBadge role={d.role || 'driver'} />
                        <StatusBadge status={d.status} />
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-body-sm text-secondary">
                        <span className="flex items-center gap-1"><Icon name="mail" size={14} /> {d.email}</span>
                        {d.todaAssociation && <span className="flex items-center gap-1"><Icon name="groups" size={14} /> {d.todaAssociation}</span>}
                        {d.vehiclePlate && <span className="flex items-center gap-1"><Icon name="pin" size={14} /> {d.vehiclePlate}</span>}
                        {d.licenseNumber && <span className="flex items-center gap-1"><Icon name="badge" size={14} /> {d.licenseNumber}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {showActions && (
                        <>
                          <ActionButton onClick={() => approve(id, 'approved')} disabled={isBusy} loading={isBusy} variant="primary" icon="check_circle">Approve</ActionButton>
                          <ActionButton onClick={() => approve(id, 'rejected')} disabled={isBusy} loading={isBusy} variant="danger" icon="cancel">Reject</ActionButton>
                        </>
                      )}
                      {!showActions && (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high text-on-surface-variant">
                          {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </AnimatedRow>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderUsers = () => {
    // Filter users based on selected filter
    const filteredUsers = userFilter === 'all'
      ? allUsers
      : allUsers.filter(u => u.status === userFilter);

    const displayTitle = userFilter === 'all' ? 'All Users' : `User Approvals - ${userFilter.charAt(0).toUpperCase() + userFilter.slice(1)}`;
    const displayCount = userFilter === 'all' ? allUsers.length : filteredUsers.length;

    return (
      <div className="animate-fade-in">
        <SectionHeader
          title={displayTitle}
          count={displayCount}
          icon="person_add"
          action={{ label: 'Refresh', icon: 'refresh', onClick: load }}
          deleteAllAction={pendingUsers.length > 0 && userFilter === 'pending' ? { label: 'Delete All', icon: 'delete_forever', onClick: () => openDeleteModal('users') } : null}
        />

        {/* Filter dropdown */}
        <div className="mb-4 flex items-center gap-2">
          <label className="text-body-sm text-secondary">Filter:</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            icon="person_add"
            title={userFilter === 'all' ? 'No Users' : `No ${userFilter.charAt(0).toUpperCase() + userFilter.slice(1)} Users`}
            description={userFilter === 'all'
              ? 'No user accounts found.'
              : `No users with status "${userFilter}" found.`}
          />
        ) : (
          <div className="space-y-2" role="list">
            {filteredUsers.map((u) => {
              const fullId = `user-${u.id}`;
              const isEntering = enteringIds.has(fullId);
              const isExiting = exitingIds.has(fullId);
              const isBusy = busy === u.id;

              // Only show approve/reject buttons for pending users
              const showActions = u.status === 'pending';

              return (
                <AnimatedRow
                  key={fullId}
                  isEntering={isEntering}
                  isExiting={isExiting}
                  className="group"
                >
                  <div className="flex items-center gap-4 py-4 px-4 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors border border-surface-container-high/50" role="listitem">
                    <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center flex-shrink-0">
                      <Icon name={roleIcons[u.role] || 'person'} size={24} className="text-primary" />
                    </div>
                    <div className="grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold truncate">{u.fullname}</p>
                        <RoleBadge role={u.role} />
                        <StatusBadge status={u.status} />
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-body-sm text-secondary">
                        <span className="flex items-center gap-1"><Icon name="mail" size={14} /> {u.email}</span>
                        <span className="flex items-center gap-1"><Icon name="calendar_today" size={14} /> {new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {showActions && (
                        <>
                          <ActionButton onClick={() => approveUser(u.id, 'approved')} disabled={isBusy} loading={isBusy} variant="primary" icon="check_circle">Approve</ActionButton>
                          <ActionButton onClick={() => approveUser(u.id, 'rejected')} disabled={isBusy} loading={isBusy} variant="danger" icon="cancel">Reject</ActionButton>
                        </>
                      )}
                      {!showActions && (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high text-on-surface-variant">
                          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </AnimatedRow>
              );
            })}
          </div>
        )}
    </div>
  );

  const renderResets = () => (
    <div className="animate-fade-in">
      <SectionHeader
        title="Password Reset Requests"
        count={getPendingCount('resets')}
        icon="lock_reset"
        action={{ label: 'Refresh', icon: 'refresh', onClick: load }}
        deleteAllAction={resetRequests.length > 0 ? { label: 'Delete All', icon: 'delete_forever', onClick: () => openDeleteModal('resets') } : null}
      />

      {resetRequests.length === 0 ? (
        <EmptyState
          icon="lock_reset"
          title="No Reset Requests"
          description="Password reset requests requiring admin approval will appear here."
        />
      ) : (
        <div className="space-y-2" role="list">
          {resetRequests.map((r) => {
            const fullId = `reset-${r.id}`;
            const isEntering = enteringIds.has(fullId);
            const isExiting = exitingIds.has(fullId);
            const isBusy = busy === r.id;

            return (
              <AnimatedRow
                key={fullId}
                isEntering={isEntering}
                isExiting={isExiting}
                className="group"
              >
                <div className="flex items-center gap-4 py-4 px-4 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors border border-surface-container-high/50" role="listitem">
                  <div className="w-14 h-14 rounded-xl bg-warning-container flex items-center justify-center flex-shrink-0">
                    <Icon name="lock_reset" size={24} className="text-on-warning-container" />
                  </div>
                  <div className="grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate">{r.fullname}</p>
                      <RoleBadge role={r.role} />
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-body-sm text-secondary">
                      <span className="flex items-center gap-1"><Icon name="mail" size={14} /> {r.email}</span>
                      <span className="flex items-center gap-1"><Icon name="calendar_today" size={14} /> {new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.status === 'pending' && (
                      <>
                        <ActionButton onClick={() => approveReset(r.id)} disabled={isBusy} loading={isBusy} variant="primary" icon="check_circle">Approve</ActionButton>
                        <ActionButton onClick={() => rejectReset(r.id)} disabled={isBusy} loading={isBusy} variant="danger" icon="cancel">Reject</ActionButton>
                      </>
                    )}
                    {r.status !== 'pending' && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high text-on-surface-variant">
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </AnimatedRow>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRides = () => (
    <div className="animate-fade-in">
      <SectionHeader
        title="Latest Rides"
        count={rides.length}
        icon="local_taxi"
        action={{ label: 'Refresh', icon: 'refresh', onClick: load }}
      />

      {rides.length === 0 ? (
        <EmptyState
          icon="local_taxi"
          title="No Rides Yet"
          description="Completed rides will appear here once booked and finished."
        />
      ) : (
        <div className="space-y-2" role="list">
          {rides.slice(0, 20).map((r) => (
            <div key={r.id} className="flex items-center gap-4 py-4 px-4 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors border border-surface-container-high/50" role="listitem">
              <div className="w-14 h-14 rounded-xl bg-secondary-container flex items-center justify-center flex-shrink-0">
                <Icon name="local_taxi" size={24} className="text-secondary" />
              </div>
              <div className="grow min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold">#{r.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container">₱{Number(r.fare || 0).toFixed(2)}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-body-sm text-secondary truncate">{r.pickup} → {r.dropoff}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-body-xs text-secondary">
                  <span className="flex items-center gap-1"><Icon name="person" size={12} /> {r.passenger ?? r.passenger_name}</span>
                  <span className="flex items-center gap-1"><Icon name="two_wheeler" size={12} /> {r.driver}</span>
                  <span className="flex items-center gap-1"><Icon name="calendar_today" size={12} /> {new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div className="animate-fade-in">
      <SectionHeader
        title="Driver Documents"
        count={getPendingCount('documents')}
        icon="description"
        action={{ label: 'Refresh', icon: 'refresh', onClick: load }}
        deleteAllAction={documents.length > 0 ? { label: 'Delete All', icon: 'delete_forever', onClick: () => openDeleteModal('documents') } : null}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon="description"
          title="No Documents"
          description="Driver document submissions will appear here for review."
        />
      ) : (
        <div className="space-y-2" role="list">
          {documents.map((d) => {
            const fullId = `doc-${d.id}`;
            const isEntering = enteringIds.has(fullId);
            const isExiting = exitingIds.has(fullId);
            const isBusy = busy === d.id;

            return (
              <AnimatedRow
                key={fullId}
                isEntering={isEntering}
                isExiting={isExiting}
                className="group"
              >
                <div className="flex items-center gap-4 py-4 px-4 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors border border-surface-container-high/50" role="listitem">
                  <div className="w-14 h-14 rounded-xl bg-secondary-container flex items-center justify-center flex-shrink-0">
                    <Icon name="description" size={24} className="text-secondary" />
                  </div>
                  <div className="grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate">{d.fullname}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant">{d.doc_type}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-body-sm text-secondary">
                      <span className="flex items-center gap-1"><Icon name="mail" size={14} /> {d.email}</span>
                      <span className="flex items-center gap-1"><Icon name="calendar_today" size={14} /> {new Date(d.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {d.status === 'pending' && (
                      <>
                        <ActionButton onClick={() => setDocStatus(d.id, 'approved')} disabled={isBusy} loading={isBusy} variant="primary" icon="check_circle">Approve</ActionButton>
                        <ActionButton onClick={() => setDocStatus(d.id, 'rejected')} disabled={isBusy} loading={isBusy} variant="danger" icon="cancel">Reject</ActionButton>
                      </>
                    )}
                    {d.status !== 'pending' && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high text-on-surface-variant">
                        {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                      </span>
                    )}
                    <button type="button" className="p-2 rounded-lg hover:bg-surface-container-high transition-colors" title="View Document">
                      <Icon name="visibility" size={20} />
                    </button>
                  </div>
                </div>
              </AnimatedRow>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeNav) {
      case 'overview': return renderOverview();
      case 'drivers': return renderDrivers();
      case 'users': return renderUsers();
      case 'resets': return renderResets();
      case 'rides': return renderRides();
      case 'documents': return renderDocuments();
      default: return renderOverview();
    }
  };

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        } bg-surface-container-lowest border-r border-surface-container-high shadow-xl`}
        style={{ height: '100vh' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo / Brand */}
          <div className={`flex items-center gap-3 p-4 border-b border-surface-container-high ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center flex-shrink-0">
              <Icon name="shield_person" size={22} className="text-on-primary-container" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-title-md font-bold text-on-surface">Admin Console</h1>
                <p className="text-body-xs text-secondary">Fairtrike Olongapo</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto" role="navigation" aria-label="Admin navigation">
            <ul className="space-y-1 px-2" role="list">
              {NAV_ITEMS.map((item) => {
                const count = item.badge ? getPendingCount(item.badge) : 0;
                const isActive = activeNav === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => { setActiveNav(item.id); setMobileSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-container text-on-primary-container shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container-high'
                      } ${sidebarCollapsed ? 'justify-center' : ''}`}
                      title={sidebarCollapsed ? item.label : ''}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon name={item.icon} size={22} className="flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="font-medium truncate">{item.label}</span>
                      )}
                      {!sidebarCollapsed && count > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-on-primary">
                          {count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Collapse toggle / User info */}
          <div className="p-4 border-t border-surface-container-high">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-surface-container-low">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <Icon name={roleIcons[user?.role] || 'person'} size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate text-on-surface">{user?.fullname || user?.email}</p>
                  <p className="text-body-xs text-secondary capitalize">{user?.role}</p>
                </div>
              </div>
            )}

            {/* Auto-refresh toggle */}
            {!sidebarCollapsed && (
              <div className="mb-3 p-2 rounded-xl bg-surface-container-low">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Icon name="refresh" size={20} className="text-on-surface-variant" />
                    <span className="font-medium text-on-surface">Auto-refresh</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      autoRefresh ? 'bg-primary' : 'bg-surface-container-high'
                    }`}
                    aria-label={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                    aria-pressed={autoRefresh}
                  >
                    <span className={`absolute top-0.5 transition-transform duration-200 w-5 h-5 rounded-full bg-white shadow-md ${
                      autoRefresh ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </label>
                {autoRefresh && (
                  <p className="text-body-xs text-secondary mt-1 ml-6">
                    Refreshing every {refreshInterval / 1000}s
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-surface-container-high ${sidebarCollapsed ? 'justify-center' : ''}`}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} size={22} className="flex-shrink-0 text-on-surface-variant" />
              {!sidebarCollapsed && <span className="font-medium">Collapse</span>}
            </button>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-error-container hover:text-error text-on-surface-variant font-medium"
              >
                <Icon name="logout" size={20} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`lg:ml-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72'} min-h-screen`}>
        {/* Mobile header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-surface-container-lowest border-b border-surface-container-high shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
              aria-label="Open menu"
            >
              <Icon name="menu" size={26} />
            </button>
            <h1 className="text-title-md font-bold">Admin Console</h1>
            <div className="w-10" />
          </div>
        </header>

        <div className="pt-16 lg:pt-0">
          <AdminHeader user={user} onLogout={logout} />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 pb-12">
          {error && (
            <div className="rounded-xl bg-error-container/50 text-error p-3 text-body-sm animate-slide-in flex items-center gap-2 mb-6" role="alert">
              <Icon name="error" size={20} />
              {error}
            </div>
          )}
          {renderContent()}
        </div>
        <Footer />
      </main>

      {/* Delete All Modal */}
      <DeleteAllModal
        isOpen={!!deleteModal}
        onClose={closeDeleteModal}
        title={deleteModal ? (deleteModal.type === 'drivers' ? 'Delete All Drivers' : deleteModal.type === 'users' ? 'Delete All Pending Users' : deleteModal.type === 'resets' ? 'Delete All Reset Requests' : 'Delete All Documents') : ''}
        description={deleteModal ? (deleteModal.type === 'drivers' ? 'This will permanently delete all driver applications from the system.' : deleteModal.type === 'users' ? 'This will permanently delete all pending user accounts from the system.' : deleteModal.type === 'resets' ? 'This will permanently delete all password reset requests from the system.' : 'This will permanently delete all driver documents from the system.') : ''}
        itemCount={deleteModal?.count ?? 0}
        onConfirm={confirmDeleteAll}
        loading={deleteLoading}
      />
    </div>
  );
}
}