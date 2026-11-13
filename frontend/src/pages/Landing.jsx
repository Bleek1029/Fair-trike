import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLoader } from '../components/BrandLoader.jsx';

// ── Welcome landing with value proposition before redirecting to sign-in ──
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
      <BrandLoader
        message="Loading Fairtrike..."
        className="min-h-screen"
      />
    );
  }

  return (
    <main className="w-full min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-12">
      {/* Brand Header */}
      <header className="w-full max-w-[480px] text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src="/fairtrike-logo.png" alt="Fairtrike logo" className="w-14 h-14 object-contain" />
          <span className="text-headline-lg font-extrabold text-on-surface tracking-tight">Fairtrike</span>
        </div>
        <p className="text-body-md text-on-surface-variant leading-relaxed">
          Olongapo's trusted tricycle ride-hailing — metered fares, live tracking, no haggling.
        </p>
      </header>

      {/* Value Props */}
      <section className="w-full max-w-[480px] space-y-3 mb-8" aria-label="Why choose Fairtrike">
        <article className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-low border border-surface-container-highest shadow-sm animate-slide-in" style={{ animationDelay: '0ms' }}>
          <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[22px]">local_taxi</span>
          </div>
          <div>
            <h3 className="text-label-lg font-bold text-on-surface">Metered Fares</h3>
            <p className="text-body-sm text-on-surface-variant mt-0.5">Government-regulated pricing — what you see is what you pay.</p>
          </div>
        </article>
        <article className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-low border border-surface-container-highest shadow-sm animate-slide-in" style={{ animationDelay: '100ms' }}>
          <div className="w-10 h-10 rounded-lg bg-tertiary-container/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-tertiary text-[22px]">gps_fixed</span>
          </div>
          <div>
            <h3 className="text-label-lg font-bold text-on-surface">Live Ride Tracking</h3>
            <p className="text-body-sm text-on-surface-variant mt-0.5">Real-time GPS for every trip — share your location with family.</p>
          </div>
        </article>
        <article className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-low border border-surface-container-highest shadow-sm animate-slide-in" style={{ animationDelay: '200ms' }}>
          <div className="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary text-[22px]">payments</span>
          </div>
          <div>
            <h3 className="text-label-lg font-bold text-on-surface">Cashless Options</h3>
            <p className="text-body-sm text-on-surface-variant mt-0.5">Pay with wallet, card, or cash — your ride, your choice.</p>
          </div>
        </article>
      </section>

      {/* CTA */}
      <div className="w-full max-w-[480px] space-y-3">
        <button
          onClick={handleGetStarted}
          disabled={redirecting}
          className="w-full min-h-[52px] px-6 py-3 rounded-xl bg-primary text-on-primary text-label-lg font-bold tracking-tight shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70"
          type="button"
        >
          <span>Get Started</span>
          <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
        </button>
        <p className="text-center text-body-sm text-on-surface-variant">
          Already have an account?{' '}
          <a href="/login" className="text-primary font-bold underline hover:text-on-primary-container">Sign In</a>
        </p>
      </div>

      {/* Trust indicator */}
      <footer className="w-full max-w-[480px] mt-10 text-center">
        <p className="text-[10px] leading-4 text-secondary uppercase tracking-wider">
          Serving Olongapo City commuters since 2024
        </p>
      </footer>
    </main>
  );
}