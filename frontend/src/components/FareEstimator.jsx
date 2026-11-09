import React from 'react';
import { Icon } from './Icon.jsx';

export function FareEstimator({ range = '—', note = 'Calculate a route to see the fare', title = 'Fare estimate' }) {
  return (
    <div className="bg-surface-container-low/70 rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon name="calculate" size={20} className="text-primary shrink-0" />
        <div className="min-w-0">
          <span className="text-label-sm text-on-surface-variant block">Estimated fare</span>
          <span className="text-label-md text-on-surface block">{title}</span>
        </div>
      </div>
      <div className="text-right min-w-0">
        <span className="text-headline-sm text-primary font-bold block whitespace-nowrap">{range}</span>
        <span className="text-label-sm text-secondary block font-semibold leading-tight">{note}</span>
      </div>
    </div>
  );
}
