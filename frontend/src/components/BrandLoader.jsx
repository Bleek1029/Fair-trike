import React from 'react';

// ── Branded full-screen loader: logo image + "Fairtrike" name ──
// Used for: boot splash (page refresh), auth submit overlays, route guards.
export function BrandMark({ size = 144 }) {
  return (
    <div className="brand-mark-wrap" style={{ width: size, height: size }}>
      <span className="brand-wind brand-wind--1"></span>
      <span className="brand-wind brand-wind--2"></span>
      <span className="brand-wind brand-wind--3"></span>
      <span className="brand-wind brand-wind--4"></span>
      <span className="brand-wind brand-wind--5"></span>
      <span className="brand-wind brand-wind--6"></span>
      <span className="brand-smoke brand-smoke--1"></span>
      <span className="brand-smoke brand-smoke--2"></span>
      <span className="brand-smoke brand-smoke--3"></span>
      <img
        src="/fairtrike-logo.png"
        alt="Fairtrike logo"
        className="brand-mark-logo"
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    </div>
  );
}

export function BrandLoader({ message = 'Loading your ride...', overlay = false }) {
  return (
    <div className={overlay ? 'brand-loader brand-loader--overlay' : 'brand-loader'}>
      <div className="brand-loader-inner">
        <BrandMark size={144} />
        <div className="brand-loader-name">
          {'Fairtrike'.split('').map((ch, i) => (
            <span key={i} className="brand-loader-letter" style={{ animationDelay: `${i * 0.06}s` }}>
              {ch}
            </span>
          ))}
        </div>
        <div className="brand-loader-sub">TRICYCLE TRANSIT</div>
        <div className="brand-loader-bar">
          <div className="brand-loader-bar-fill" />
        </div>
        <div className="brand-loader-msg">{message}</div>
      </div>
    </div>
  );
}
