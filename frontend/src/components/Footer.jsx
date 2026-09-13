import React from 'react';
import { Link } from 'react-router-dom';

const FOOTER_COLS = {
  'Quick Links': [
    ['Home Transit Portal', '/app'],
    ['Book a Tricycle', '/app'],
    ['Official Fare Matrix', '/dashboard'],
    ['Driver & TODA Hub', '/dashboard'],
  ],
  'Safety & Integrity': [
    ['Passenger Safety Charter', '/dashboard'],
    ['No-Overcharging Policy', '/dashboard'],
    ['24/7 Hotline & SOS Dispatch', '/dashboard'],
    ['Privacy & Ordinance Terms', '/dashboard'],
  ],
};

const COVERAGE = ['East Bajac-Bajac Central', 'Gordon Heights Line', 'Subic Bay Gateway Loop', 'Barretto Beachfront Zone'];

export function Footer() {
  return (
    <footer className="w-full bg-surface-container-low mt-8 md:mt-12 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <div className="w-full max-w-[1280px] mx-auto px-margin lg:px-margin-desktop py-6 md:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 pb-6 md:pb-8">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-[20px]">electric_rickshaw</span>
              </div>
              <span className="text-headline-sm text-on-surface font-bold">Fairtrike</span>
            </div>
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Modern municipal tricycle transit hailing and fixed-zone fare matrix for Olongapo City commuters, operators, and visitors.
            </p>
            <div className="flex items-center gap-1 text-label-sm text-tertiary">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
              City Transit Authority Certified
            </div>
          </div>

          {Object.entries(FOOTER_COLS).map(([title, links]) => (
            <div className="flex flex-col gap-2" key={title}>
              <h4 className="text-label-lg text-on-surface uppercase tracking-wider mb-1">{title}</h4>
              {links.map(([label, to]) => (
                <Link key={label} to={to} className="text-body-md text-on-surface-variant hover:text-on-surface transition-colors">{label}</Link>
              ))}
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <h4 className="text-label-lg text-on-surface uppercase tracking-wider mb-1">Coverage Corridors</h4>
            {COVERAGE.map((c) => (
              <div className="flex items-center gap-1 text-body-sm text-on-surface-variant" key={c}>
                <span className="material-symbols-outlined text-secondary text-[16px]">pin_drop</span>
                {c}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3 text-body-sm text-on-surface-variant md:flex-row md:items-center md:justify-between md:gap-4">
          <p>© 2025 Fairtrike Transit Technologies. Dedicated to fair urban mobility in Olongapo City.</p>
          <div className="flex items-center gap-4">
            <span className="text-label-sm text-secondary whitespace-nowrap">Olongapo City Traffic Management Board Compliant</span>
            <span className="w-2 h-2 rounded-full bg-tertiary" />
          </div>
        </div>
      </div>
    </footer>
  );
}