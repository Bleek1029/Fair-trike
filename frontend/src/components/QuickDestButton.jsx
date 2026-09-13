import React from 'react';
import { Icon } from './Icon.jsx';

export function QuickDestButton({ icon, label, sub, distance, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="bg-surface-container-lowest p-3 rounded-xl shadow-sm text-left flex flex-col justify-between h-24 hover:bg-surface-container-low transition-colors"
    >
      <div className="flex items-center justify-between w-full">
        <div className="w-8 h-8 rounded-full bg-secondary-container/60 flex items-center justify-center text-on-secondary-container">
          <Icon name={icon} size={18} />
        </div>
        {distance && (
          <span className="text-label-sm text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">{distance}</span>
        )}
      </div>
      <div>
        <span className="text-label-md text-on-surface block truncate font-bold">{label}</span>
        <span className="text-body-sm text-on-surface-variant block truncate">{sub}</span>
      </div>
    </button>
  );
}
