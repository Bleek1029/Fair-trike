// ── Turn-by-turn navigation helpers ─────────────────────────
// Fetches driving steps from the public OSRM API between two points.
export async function fetchSteps(pickupCoord, dropoffCoord) {
  const a = pickupCoord;
  const b = dropoffCoord;
  if (!a || !b) return null;
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=true`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = await r.json();
    const route = d?.routes?.[0];
    if (!route) return null;
    const steps = [];
    for (const leg of route.legs ?? []) {
      for (const step of leg.steps ?? []) {
        const m = step.maneuver ?? {};
        steps.push({
          instruction: maneuverText(m.type, m.modifier),
          road: step.name || '',
          distance: step.distance ?? 0,
          duration: step.duration ?? 0,
          location: m.location ? [m.location[1], m.location[0]] : null,
        });
      }
    }
    return { distance: route.distance, duration: route.duration, steps };
  } catch {
    return null;
  }
}

const maneuverText = (type, modifier) => {
  if (type === 'depart') return 'Start — head out';
  if (type === 'arrive') return 'You have arrived at the destination';
  if (type === 'roundabout' || type === 'rotary') return 'Take the roundabout';
  const mod = modifier ? ` ${modifier.replace(/-/g, ' ')}` : '';
  if (type === 'turn') return `Turn${mod}`;
  if (type === 'new name') return `Continue${mod}`;
  if (type === 'merge') return `Merge${mod}`;
  if (type === 'fork') return `Keep${mod}`;
  if (type === 'end of road') return `At the end of the road, turn${mod}`;
  if (type === 'continue') return `Continue${mod}`;
  return `Proceed${mod}`;
};

export const fmtStepDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
