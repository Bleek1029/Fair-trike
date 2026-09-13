import React from 'react';
import { Icon } from './Icon.jsx';

export function TariffSheet({ open, driver, onClose, onBook }) {
  if (!open || !driver) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-driver-name"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface-container-lowest rounded-t-2xl p-space-lg shadow-2xl flex flex-col gap-space-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-secondary font-bold uppercase tracking-wider">{driver.toda}</span>
            <h3 id="sheet-driver-name" className="text-headline-md text-on-surface font-extrabold">{driver.name}</h3>
            <p className="text-body-sm text-on-surface-variant">{driver.terminal} • LGU MTOP {driver.franchise}</p>
          </div>
          <button type="button" aria-label="Close tariff dialog" onClick={onClose} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low">
          <div>
            <span className="text-label-sm text-outline">Trike Body</span>
            <p className="text-headline-sm text-primary font-black">{driver.trike}</p>
          </div>
          <div>
            <span className="text-label-sm text-outline">Plate Number</span>
            <p className="text-label-lg text-on-surface font-bold">{driver.plate}</p>
          </div>
          <div>
            <span className="text-label-sm text-outline">Rating</span>
            <p className="text-label-lg text-on-surface font-bold">★ {driver.rating}</p>
          </div>
        </div>
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-headline-sm text-on-surface font-bold">Official Fare Matrix</h4>
            <span className="text-label-sm text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded-full">LGU Approved</span>
          </div>
          <div className="flex flex-col rounded-xl bg-surface-container gap-1 p-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest">
              <div>
                <p className="text-label-lg text-on-surface font-bold">First 1.0 km (Base Fare)</p>
                <p className="text-body-sm text-on-surface-variant">Regular Commuter</p>
              </div>
              <span className="text-headline-sm text-primary font-black">₱15.00</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest">
              <div>
                <p className="text-label-lg text-on-surface font-bold">Student / Senior / PWD</p>
                <p className="text-body-sm text-on-surface-variant">20% Statutory Discount</p>
              </div>
              <span className="text-headline-sm text-secondary font-black">₱12.00</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest">
              <div>
                <p className="text-label-lg text-on-surface font-bold">Each Succeeding km</p>
                <p className="text-body-sm text-on-surface-variant">Standard Rate per km</p>
              </div>
              <span className="text-headline-sm text-on-surface font-black">+₱3.00</span>
            </div>
          </div>
        </div>
        <div className="flex gap-space-xs pt-2">
          <button
            type="button"
            onClick={onBook}
            className="flex-1 h-12 rounded-xl bg-primary text-on-primary text-label-lg font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary-container"
          >
            <Icon name="near_me" size={20} />
            <span>Book with this Operator</span>
          </button>
        </div>
      </div>
    </div>
  );
}
