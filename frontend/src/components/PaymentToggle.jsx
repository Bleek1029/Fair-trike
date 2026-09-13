import React from 'react';
import { Icon } from './Icon.jsx';

export function PaymentToggle({ method, balance, onToggle }) {
  const isWallet = method === 'wallet';
  return (
    <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
          <Icon name="account_balance_wallet" size={22} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-label-lg text-on-surface">{isWallet ? 'Fairtrike Wallet' : 'GCash'}</span>
            <span className="bg-secondary-container text-on-secondary-container text-[10px] px-1.5 rounded font-bold">ACTIVE</span>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Available Balance: <strong className="text-primary font-bold">{balance}</strong>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-primary text-label-md flex items-center gap-1 shrink-0"
      >
        <span>Switch to {isWallet ? 'GCash' : 'Wallet'}</span>
        <Icon name="sync_alt" size={16} />
      </button>
    </div>
  );
}
