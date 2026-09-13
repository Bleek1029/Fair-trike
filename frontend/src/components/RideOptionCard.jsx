import React from 'react';
import { Icon } from './Icon.jsx';

export function RideOptionCard({ id, icon, title, badge, badgeClass, desc, meta, fare, strikeFare, fareNote, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`cursor-pointer w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm transition-all hover:bg-surface-container-low relative text-left ${
        active ? 'shadow-md ring-2 ring-primary-container bg-primary-fixed/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            active ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface'
          }`}>
            <Icon name={icon} size={28} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className={`text-headline-sm font-semibold ${active ? 'text-primary' : 'text-on-surface'}`}>{title}</h3>
              {badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${badgeClass}`}>{badge}</span>
              )}
            </div>
            <p className="text-body-sm text-on-surface-variant">{desc}</p>
            {meta && <div className="flex items-center gap-2 mt-1 text-body-sm text-on-surface-variant">{meta}</div>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-headline-md font-extrabold block ${active ? 'text-primary' : 'text-on-surface'}`}>{fare}</span>
          {strikeFare ? (
            <span className="text-label-sm line-through text-outline block">{strikeFare}</span>
          ) : (
            <span className="text-label-sm text-outline block">{fareNote}</span>
          )}
        </div>
      </div>
    </button>
  );
}
