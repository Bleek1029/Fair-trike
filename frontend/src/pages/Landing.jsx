import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLoader } from '../components/BrandLoader.jsx';

// ── Landing page matching the Fairtrike brand design ──
export function Landing() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Show content after brand loader animation completes
    const timer = setTimeout(() => setShowContent(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    setRedirecting(true);
    navigate('/login', { replace: true });
  };

  if (!showContent) {
    return (
      <BrandLoader message="Loading Fairtrike..." className="min-h-screen" />
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faff] text-slate-800 flex flex-col relative overflow-x-hidden">
      {/* Header */}
      <header className="w-full pt-8 pb-4 px-6 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-xs font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Olongapo Official Mobility Partner</span>
          </div>
          <a href="#toda-matrix" className="text-xs font-medium text-slate-500 hover:text-emerald-700 transition-colors">
            TODA Fare Guide 2024
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 py-6 relative z-10">
        <div className="w-full max-w-[580px] mx-auto bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-subtle-glow">
          <section className="text-center p-6">
            {/* Brand & Logo */}
            <div className="flex items-center justify-center gap-3.5 mb-4 group cursor-default">
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100/80 p-1.5 shadow-sm transition-transform duration-300 group-hover:scale-105">
                <img
                  alt="Fairtrike Green Tricycle Logo"
                  className="w-full h-full object-contain drop-shadow-sm"
                  loading="eager"
                  src="/fairtrike-logo.png"
                />
              </div>
              <div className="text-left">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-none">
                  Fairtrike
                </h1>
                <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 mt-1">
                  Olongapo City Commuter Mobility
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto font-normal">
              Olongapo's trusted tricycle ride-hailing — metered fares, live tracking, no haggling.
            </p>
          </section>

          {/* Call to action */}
          <section className="space-y-4">
            <button
              onClick={handleGetStarted}
              disabled={redirecting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-brand-900 hover:bg-brand-950 active:scale-[0.99] text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              type="button"
            >
              <span>Get Started</span>
            </button>
            <div className="text-center pt-1">
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Already have an account?{' '}
                <a href="#signin" className="text-emerald-800 font-bold hover:underline hover:text-emerald-950 ml-1 inline-block">
                  Sign In
                </a>
              </p>
            </div>
          </section>

          {/* Trust footer */}
          <footer className="w-full pb-8 pt-4 px-4 text-center relative z-10">
            <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-emerald-800/90">
                <span>Serving Olongapo City Commuters Since 2024</span>
              </div>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-[11px] text-slate-400 font-medium">
                In coordination with City TODA Federations
              </span>
            </div>
          </footer>
        </div>
      </main>
    </main>
  );
}
