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

export function formatCurrency(amount, digits = 2) {
  return formatPeso(amount, digits);
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}