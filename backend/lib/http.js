// ── Consistent response shapes ──
export const ok = (res, data = {}) => res.json({ success: true, ...data });
export const created = (res, data = {}) => res.status(201).json({ success: true, ...data });