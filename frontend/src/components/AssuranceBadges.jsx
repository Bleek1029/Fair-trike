import React from 'react';
import { Icon } from './Icon.jsx';

const DEFAULT_BADGES = [
  { icon: 'verified_user', title: 'Registered drivers', desc: 'Accounts reviewed before approval' },
  { icon: 'price_check', title: 'Computed fare', desc: 'Fare derived from route distance' },
  { icon: 'emergency', title: 'In-app SOS', desc: 'Reach emergency services', danger: true },
];

export function AssuranceBadges({ badges = DEFAULT_BADGES }) {
  return (
    <section className="flex gap-space-sm overflow-x-auto pb-1 -mx-margin px-margin">
      {badges.map((b) => (
        <div key={b.title} className="flex items-center gap-space-xs px-space-sm py-2 rounded-xl bg-surface-container-low shadow-sm shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            b.danger ? 'bg-error-container text-on-error-container' : 'bg-secondary-container/60 text-on-secondary-container'
          }`}>
            <Icon name={b.icon} size={18} />
          </div>
          <div className="flex flex-col">
            <span className={`text-label-sm font-bold ${b.danger ? 'text-error' : 'text-primary'}`}>{b.title}</span>
            <span className="text-body-sm text-on-surface-variant">{b.desc}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
