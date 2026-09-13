import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export function HeroPerk({ icon, iconBg, title, desc }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-xl bg-white/5 backdrop-blur hover:bg-white/10 transition-all duration-300">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${iconBg}`}>
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] leading-4 font-bold text-surface-bright">{title}</span>
        <span className="text-[10px] leading-3 text-surface-variant ft-clamp-1">{desc}</span>
      </div>
    </div>
  );
}

export function AuthSplit({
  heroEyebrow = 'Olongapo City Transit',
  heroTitle = 'Join Fairtrike Today.',
  heroSubtitle = 'Olongapo’s trusted commuter network for verified tricycles, transparent regulated fares, and safer everyday journeys.',
  perks = [],
  quote = '“Never have to haggle with fares from Subic Gate to Mabayuan anymore.”',
  formBadge = 'Fast 1-Minute Passenger Sign-Up',
  formTitle = 'Create Account',
  formSubtitle = 'Start your journey with Fairtrike today and enjoy reliable, metered commutes.',
  children,
  bottom,
}) {
  return (
    <main className="w-full bg-surface min-h-screen lg:h-screen flex items-center justify-center px-3 py-3 lg:py-4 lg:overflow-hidden">
      <div className="flex flex-col w-full">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch rounded-2xl overflow-hidden shadow-2xl bg-surface-container-lowest lg:h-[calc(100vh-1.5rem)] lg:max-h-[580px] lg:min-h-[500px]">
            <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-3 xl:p-3.5 bg-gradient-to-br from-on-background via-inverse-surface to-on-background text-on-primary overflow-hidden overflow-y-auto">
              <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-tertiary-container/15 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-1">
                <div className="flex items-center space-x-3">
                  <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
                    <span className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-on-primary-container text-[18px]">electric_rickshaw</span>
                    </span>
                    <span className="text-surface-bright font-bold tracking-tight text-[13px]">Fairtrike</span>
                  </Link>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-highest/20 backdrop-blur text-primary-fixed text-[10px] uppercase tracking-wider">
                    Transit Utility
                  </span>
                </div>
                <div className="space-y-0.5 pt-0.5">
                  <span className="text-primary-fixed text-[10px] tracking-wider uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-primary-container">local_taxi</span>
                    {heroEyebrow}
                  </span>
                  <h1 className="text-[20px] leading-[24px] font-extrabold text-surface-bright tracking-tight">{heroTitle}</h1>
                  <p className="text-[11px] leading-4 text-surface-variant font-medium ft-clamp-2">{heroSubtitle}</p>
                </div>
                <div className="space-y-0.5 pt-0.5">
                  {perks.map((p) => (<HeroPerk key={p.title} {...p} />))}
                </div>
              </div>
              <div className="relative z-10 pt-2 mt-2 border-t border-white/10 flex flex-col gap-1">
                <div className="flex items-center justify-between text-surface-variant text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-tertiary-fixed">
                    <span className="material-symbols-outlined text-[13px]">verified_user</span>LGU Regulated
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">lock</span>256-Bit Encrypted
                  </span>
                  <span className="flex items-center gap-1 text-primary-fixed">
                    <span className="material-symbols-outlined text-[13px]">shield</span>SOS Ready
                  </span>
                </div>
                <div className="p-2 bg-white/5 rounded-xl flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container font-bold text-[11px] shrink-0">4.9</div>
                  <p className="text-[10px] leading-3 text-surface-variant italic ft-clamp-2">{quote}</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 p-3 md:p-3.5 xl:p-4 flex flex-col justify-start bg-surface-container-lowest lg:overflow-y-auto min-h-0">
              <div className="max-w-lg w-full mx-auto my-auto space-y-2 py-1">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />{formBadge}
                  </div>
                  <div className="lg:hidden flex items-center gap-2 pb-1">
                    <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
                      <span className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary-container text-[18px]">electric_rickshaw</span>
                      </span>
                      <span className="text-on-surface font-bold text-[14px]">Fairtrike</span>
                    </Link>
                  </div>
                  <h2 className="text-[20px] leading-6 font-bold text-on-surface tracking-tight">{formTitle}</h2>
                  <p className="text-[11px] leading-4 text-secondary ft-clamp-1">{formSubtitle}</p>
                </div>
                {children}
                {bottom}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


export function ErrorAlert({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="p-2 rounded-xl bg-error-container text-on-error-container flex items-start gap-2">
      <span className="material-symbols-outlined text-error text-[18px] shrink-0">error</span>
      <div className="flex-1 text-[12px]">
        <p className="font-bold text-[12px]">Please check your inputs</p>
        <p className="text-[11px]">{message}</p>
      </div>
      {onClose && (
        <button className="text-on-error-container hover:opacity-75" onClick={onClose} type="button">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}

export function SuccessAlert({ title = 'Welcome aboard!', message }) {
  if (!message) return null;
  return (
    <div className="p-2 rounded-xl bg-tertiary-container/20 text-on-tertiary-container flex items-start gap-2">
      <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
      <div className="flex-1 text-[12px]">
        <p className="font-bold text-[12px]">{title}</p>
        <p className="text-[11px]">{message}</p>
      </div>
    </div>
  );
}

export const FIELD_INPUT = 'w-full py-2 pl-9 pr-8 bg-surface-container-low rounded-lg text-[13px] text-on-surface placeholder:text-secondary/70 focus:outline-none focus:bg-surface transition-all duration-150 shadow-sm';

export function TextField({ id, label, icon, valid, hint, ...rest }) {
  return (
    <div className="space-y-0.5">
      <label className="block text-[12px] font-extrabold tracking-wide text-on-surface" htmlFor={id}>{label}</label>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-2.5 text-[#42506b] text-[18px] pointer-events-none">{icon}</span>
        <input id={id} {...rest} className={FIELD_INPUT} />
        {valid && (<span className="material-symbols-outlined absolute right-2.5 text-tertiary text-[18px]">check_circle</span>)}
      </div>
      {hint && <p className="text-[10px] leading-3 text-secondary px-0.5 ft-clamp-1">{hint}</p>}
    </div>
  );
}

export function passwordChecks(val) {
  const v = val || '';
  return { hasMinLength: v.length >= 6, hasUppercase: /[A-Z]/.test(v), hasNumber: /[0-9]/.test(v) };
}

export function StrengthMeter({ password }) {
  const { hasMinLength, hasUppercase, hasNumber } = passwordChecks(password);
  const score = (hasMinLength ? 1 : 0) + (hasUppercase ? 1 : 0) + (hasNumber ? 1 : 0);
  const rule = (ok, label) => (
    <div className={`flex items-center gap-1 transition-colors ${ok ? 'text-tertiary font-semibold' : 'text-secondary'}`}>
      <span className="material-symbols-outlined text-[12px]">{ok ? 'check' : 'fiber_manual_record'}</span>
      <span className="text-[10px]">{label}</span>
    </div>
  );
  let b0 = 'bg-surface-variant'; let b1 = 'bg-surface-variant'; let b2 = 'bg-surface-variant';
  let label = 'Awaiting input'; let labelCls = 'font-bold text-secondary';
  if ((password || '').length > 0) {
    if (score === 1) { b0 = 'bg-error'; label = 'Weak'; labelCls = 'font-bold text-error'; }
    else if (score === 2) { b0 = 'bg-primary-container'; b1 = 'bg-primary-container'; label = 'Moderate'; labelCls = 'font-bold text-primary'; }
    else if (score === 3) { b0 = 'bg-tertiary-container'; b1 = 'bg-tertiary-container'; b2 = 'bg-tertiary-container'; label = 'Strong & Secure'; labelCls = 'font-bold text-tertiary'; }
  }
  return (
    <div className="pt-1 space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-secondary font-medium">Strength Meter</span>
        <span className={labelCls}>{label}</span>
      </div>
      <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden flex gap-0.5">
        <div className={`h-full flex-1 transition-all duration-300 ${b0}`} />
        <div className={`h-full flex-1 transition-all duration-300 ${b1}`} />
        <div className={`h-full flex-1 transition-all duration-300 ${b2}`} />
      </div>
      <div className="grid grid-cols-3 gap-1 pt-0.5 text-[10px]">
        {rule(hasMinLength, '6+ chars')}
        {rule(hasUppercase, 'Uppercase')}
        {rule(hasNumber, 'Number')}
      </div>
    </div>
  );
}

export function PasswordField({ label = 'Password', value, onChange, placeholder = 'Create secure password', id = 'password', withMeter = true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-0.5">
      <label className="block text-[12px] font-extrabold tracking-wide text-on-surface" htmlFor={id}>{label}</label>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-2.5 text-[#42506b] text-[18px] pointer-events-none">lock</span>
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} required className="w-full py-2 pl-9 pr-9 bg-surface-container-low rounded-lg text-[13px] text-on-surface placeholder:text-secondary/70 focus:outline-none focus:bg-surface transition-all duration-150 shadow-sm" />
        <button aria-label="Toggle password visibility" className="absolute right-1.5 p-1 rounded-md bg-surface-container-low border border-[#b9cdf3] text-[#42506b] hover:text-on-surface hover:border-[#8fb0ea] focus:outline-none transition-colors" onClick={() => setShow(!show)} type="button">
          <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {withMeter && <StrengthMeter password={value} />}
    </div>
  );
}

export function TermsCheckbox({ checked, onChange, label }) {
  return (
    <div className="pt-0.5">
      <label className="flex items-start gap-2 cursor-pointer select-none group">
        <div className="relative flex items-center justify-center mt-0.5">
          <input className="peer sr-only" type="checkbox" checked={checked} onChange={onChange} required />
          <div className={`w-4 h-4 rounded transition-all flex items-center justify-center ${checked ? 'bg-on-background border border-on-background' : 'bg-white border-2 border-[#8fa3c4]'}`}>
            <span className={`material-symbols-outlined text-white text-[14px] font-bold transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}>check</span>
          </div>
        </div>
        <span className="text-[11px] leading-4 text-secondary group-hover:text-on-surface transition-colors">{label}</span>
      </label>
    </div>
  );
}

export function SubmitButton({ loading, loadingText, children }) {
  return (
    <div className="pt-0.5">
      <button className="w-full min-h-[40px] px-6 py-1.5 rounded-xl bg-gradient-to-r from-primary-container to-primary-container hover:from-primary hover:to-primary-container text-on-primary text-[13px] font-bold tracking-tight shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 group disabled:opacity-70" type="submit" disabled={loading}>
        {loading ? (
          <React.Fragment><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span>{loadingText}</span></React.Fragment>
        ) : (
          <React.Fragment><span>{children}</span><span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span></React.Fragment>
        )}
      </button>
    </div>
  );
}