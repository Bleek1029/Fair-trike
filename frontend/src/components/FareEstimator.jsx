import React from 'react';
import { Icon } from './Icon.jsx';

export function FareEstimator({ range = '₱15.00 - ₱45.00', note = 'Strict Metered Rate', title = 'Regular Passenger Fare' }) {
  return (
    <div className="bg-surface-container-low/70 rounded-lg p-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon name="calculate" size={20} className="text-primary shrink-0" />
        <div className="min-w-0">
          <span className="text-label-sm text-on-surface-variant block">City Tariff Est.</span>
          <span className="text-label-md text-on-surface truncate block">{title}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-headline-sm text-primary font-bold block">{range}</span>
        <span className="text-label-sm text-secondary block font-semibold">{note}</span>
      </div>
    </div>
  );
}
