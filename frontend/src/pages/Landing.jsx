import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Chrome.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Footer } from '../components/Footer.jsx';

const FEATURES = [
  { icon: 'shield_with_house', title: 'Safe Rides', text: 'Vetted drivers and well-maintained vehicles for your safety' },
  { icon: 'bolt', title: 'Quick Service', text: 'Fast pickup times and efficient routes to get you there' },
  { icon: 'payments', title: 'Affordable Rates', text: 'Competitive pricing with no hidden fees' },
  { icon: 'calendar_month', title: 'Easy Booking', text: 'Simple app interface for hassle-free ride booking' },
];

export function Landing() {
  return (
    <div className="w-full min-h-screen bg-surface text-on-surface" style={{ paddingTop: '5rem' }}>
      <Header />
      <main className="w-full bg-surface">
        <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-8 py-14 flex flex-col gap-10">
          <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-10 lg:p-14 shadow-sm text-center">
            <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-primary-container/15 blur-3xl pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-tertiary-container/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-[40px] shadow-md">
                <span className="material-symbols-outlined" style={{ fontSize: 44 }}>electric_rickshaw</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-tertiary-container/20 text-on-tertiary-container text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Authorized Olongapo City Transit
              </span>
              <h1 className="text-display tracking-tight text-on-surface">Welcome to Fairtrike</h1>
              <h2 className="text-headline-lg text-on-surface">Your Trusted Transportation Partner</h2>
              <p className="text-body-lg text-on-surface-variant max-w-2xl">
                Experience safe, reliable, and affordable rides in Olongapo City.
                We&apos;re committed to making your journey comfortable and convenient.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="px-6 py-3 rounded-xl bg-primary-container hover:bg-primary-fixed-dim text-on-primary-container text-headline-sm font-bold shadow-sm">
                  <span className="material-symbols-outlined text-[20px] align-middle mr-1">arrow_forward</span>
                  Get Started
                </Link>
                <Link to="/app" className="px-6 py-3 rounded-xl bg-surface-container-high text-on-surface text-headline-sm font-bold">Go to Map</Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col gap-3" key={f.title}>
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary-fixed-variant">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>{f.icon}</span>
                </div>
                <h3 className="text-headline-sm text-on-surface font-bold">{f.title}</h3>
                <p className="text-body-sm text-on-surface-variant">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
      <Footer />
    </div>
  );
}