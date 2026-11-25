import React, { useEffect, useState } from 'react';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { apiGetEarnings, apiAiSummary } from '../api.js';

// ── Driver earnings — real report from completed trips ──
export function DriverEarnings() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiGetEarnings()
      .then(async (data) => {
        if (!mounted) return;
        setReport(data);
        setLoading(false);
        // Generate an AI earnings recap from real (non-hardcoded) data.
        try {
          setAiSummaryLoading(true);
          const summary = await apiAiSummary('driver', data);
          if (mounted) setAiSummary(summary.summary || '');
        } catch (err) {
          if (mounted) setAiSummary('Unable to generate earnings summary at this time.');
        } finally {
          if (mounted) setAiSummaryLoading(false);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const fmtPeso = (n) => `₱${Number(n || 0).toFixed(2)}`;
  const dayLabel = (day) => {
    const d = new Date(`${day}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md" style={{ paddingTop: '5rem', paddingBottom: '6rem' }}>
      <MobileHeader />
      <main className="max-w-[520px] mx-auto px-space-md py-space-lg flex flex-col gap-space-lg pb-28">
        <section className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <Icon name="payments" size={22} />
          </div>
          <div>
            <h1 className="text-headline-sm font-bold">Earnings</h1>
            <p className="text-body-sm text-on-surface-variant">Earnings from your completed trips.</p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm text-center">
            <p className="text-body-sm text-on-surface-variant">Loading earnings…</p>
          </div>
        ) : error && (
          <div className="rounded-xl bg-error-container/50 text-error p-space-md text-body-sm">{error}</div>
        )}

        <section className="rounded-2xl bg-primary-container/25 p-space-lg shadow-sm flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
            <Icon name="account_balance_wallet" size={24} />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant">This week</p>
            <p className="text-display-sm font-bold">{fmtPeso(report?.week?.earnings)}</p>
            <p className="text-label-sm text-on-surface-variant">{report?.week?.trips ?? 0} completed trips</p>
          </div>
        </section>

        <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm grid grid-cols-2 gap-space-sm">
          <div className="rounded-xl bg-surface p-space-md flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name="today" size={14} /> Today</span>
            <span className="text-headline-sm font-bold">{fmtPeso(report?.today?.earnings)}</span>
            <span className="text-label-sm text-on-surface-variant">{report?.today?.trips ?? 0} trips</span>
          </div>
          <div className="rounded-xl bg-surface p-space-md flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name="military_tech" size={14} /> All time</span>
            <span className="text-headline-sm font-bold">{fmtPeso(report?.totals?.earnings)}</span>
            <span className="text-label-sm text-on-surface-variant">{report?.totals?.trips ?? 0} trips</span>
          </div>
        </section>

        <section className="flex flex-col gap-space-sm">
          {report ? (
            report.daily.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm text-center">
                <p className="text-body-sm text-on-surface-variant">No completed trips in the last 7 days yet.</p>
              </div>
            ) : (
              report.daily.map((r) => (
                <article key={r.day} className="rounded-2xl bg-surface-container-low p-space-md shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-title-sm font-bold">{dayLabel(r.day)}</p>
                    <p className="text-label-sm text-on-surface-variant">{r.trips} trips</p>
                  </div>
                  <span className="text-title-md font-bold">{fmtPeso(r.earnings)}</span>
                </article>
              ))
            )
          ) : (
            <div className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm text-center">
              <p className="text-body-sm text-on-surface-variant">Loading earnings…</p>
            </div>
          )}
        </section>

        {/* AI earnings recap — generated from real trip data, no hardcoded figures */}
        {(aiSummary || aiSummaryLoading) && (
          <section className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm border border-surface-variant">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="auto_awesome" size={20} />
              <h3 className="text-title-sm font-bold text-on-surface">Earnings Recap</h3>
            </div>
            {aiSummaryLoading ? (
              <div className="p-space-md text-center">
                <p className="text-body-sm text-on-surface-variant">Generating summary…</p>
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant whitespace-pre-wrap">{aiSummary}</p>
            )}
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

