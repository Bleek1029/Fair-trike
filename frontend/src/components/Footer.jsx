import React from 'react';
import { Link } from 'react-router-dom';

export function Footer({ hideOnAdmin = false }) {
  if (hideOnAdmin) return null;
  return (
    <footer className="w-full bg-surface-container-low mt-8 md:mt-12 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <div className="w-full max-w-[1280px] mx-auto px-margin lg:px-margin-desktop py-6 md:py-8">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <img src="/fairtrike-logo.png" alt="Fairtrike logo" className="w-12 h-12 object-contain" />
            <span className="text-headline-sm text-on-surface font-bold">Fairtrike</span>
          </div>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Tricycle ride-hailing and fare-sharing for commuters and drivers.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3 text-body-sm text-on-surface-variant md:flex-row md:items-center md:justify-between md:gap-4">
          <p>© {new Date().getFullYear()} Fairtrike. All rights reserved.</p>
          <Link to="/app" className="text-label-md text-primary font-bold">Open the map →</Link>
        </div>
      </div>
    </footer>
  );
}