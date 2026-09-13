// ── Deterministic formatting helpers ──

export function fmtDist(meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function fmtTime(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} min`;
  return `${Math.round(seconds)} sec`;
}

export function formatPeso(amount, digits = 2) {
  const n = Number(amount);
  return Number.isFinite(n) ? `₱${n.toFixed(digits)}` : '₱0.00';
}