import React from 'react';

// ── Branded full-screen loader: FT logo badge + "Fairtrike" name ──
// Used for: boot splash (page refresh), auth submit overlays, route guards.
export function BrandMark({ size = 72 }) {
  return (
    <div className="brand-mark" style={{ width: size, height: size }}>
      <span className="brand-mark-ft">FT</span>
      <span className="brand-mark-check">
        <span className="material-symbols-outlined">check</span>
      </span>
      <span className="brand-mark-ring" />
    </div>
  );
}

export function BrandLoader({ message = 'Loading your ride...', overlay = false }) {
  return (
    <div className={overlay ? 'brand-loader brand-loader--overlay' : 'brand-loader'}>
      <div className="brand-loader-inner">
        <BrandMark size={76} />
        <div className="brand-loader-name">
          {'Fairtrike'.split('').map((ch, i) => (
            <span key={i} className="brand-loader-letter" style={{ animationDelay: `${i * 0.06}s` }}>
              {ch}
            </span>
          ))}
        </div>
        <div className="brand-loader-sub">OLONGAPO CITY TRANSIT</div>
        <div className="brand-loader-bar">
          <div className="brand-loader-bar-fill" />
        </div>
        <div className="brand-loader-msg">{message}</div>
      </div>
    </div>
  );
}
