// ── Role helpers (single source of truth for role-based routing) ──
export const isDriver = (user) => user?.role === 'driver';
export const isAdmin = (user) => user?.role === 'admin';

// Where each role lands after login / when visiting the app root.
export const homePathFor = (user) => {
  if (isDriver(user)) return '/driver';
  if (isAdmin(user)) return '/admin';
  return '/app';
};
