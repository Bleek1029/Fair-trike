import React from 'react';

export function Icon({ name, size = 20, filled = false, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, fontVariationSettings: filled ? "'FILL' 1" : undefined }}
    >
      {name}
    </span>
  );
}
