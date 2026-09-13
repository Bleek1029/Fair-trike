import React from 'react';
import { Icon } from './Icon.jsx';

export function DriverProximityCard({ name, toda, trike, rating, distance, trips, certified, onCall, onChat }) {
  return (
    <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-secondary text-[20px]"><Icon name="two_wheeler" size={20} /></span>
          <span className="text-label-lg text-primary font-semibold">Closest Available Driver</span>
        </div>
        <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-label-sm font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> {distance}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-label-md font-bold text-on-primary-fixed">
              {(name || 'FT').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary rounded-full p-0.5 shadow">
              <Icon name="verified" size={14} />
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="text-headline-sm text-on-surface truncate">{name}</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-surface-container text-primary text-label-sm px-2 py-0.5 rounded-md font-bold">{toda} {trike}</span>
              <span className="flex items-center text-primary text-label-sm font-bold">
                <Icon name="star" size={14} filled className="text-amber-500 mr-0.5" /> {rating}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onCall} aria-label="Call driver" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-secondary-container/40 transition-colors">
            <Icon name="call" size={20} />
          </button>
          <button type="button" onClick={onChat} aria-label="Chat with driver" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-secondary-container/40 transition-colors">
            <Icon name="chat" size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="flex items-center gap-1.5 text-on-surface-variant text-label-sm bg-surface-container-low px-2 py-1 rounded-md">
          <Icon name="task_alt" size={16} className="text-secondary" />
          <span className="truncate">{trips}</span>
        </div>
        <div className="flex items-center gap-1.5 text-on-surface-variant text-label-sm bg-surface-container-low px-2 py-1 rounded-md">
          <Icon name="health_and_safety" size={16} className="text-secondary" />
          <span className="truncate">{certified}</span>
        </div>
      </div>
    </div>
  );
}
