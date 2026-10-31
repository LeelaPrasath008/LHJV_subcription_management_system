import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { ErrorBanner, fmtDate, PageHeader, Stat } from '../components/ui';

type RiskItem = {
  subscriptionId: number;
  customer: string;
  email: string;
  plan: string;
  status: string;
  endDate: string;
  autoRenew: boolean;
  score: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  recommendedActions: string[];
};

function riskClass(risk: RiskItem['risk']) {
  if (risk === 'HIGH') return 'bg-red-100 text-red-700';
  if (risk === 'MEDIUM') return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-700';
}

export default function RenewalInsights() {
  const [items, setItems] = useState<RiskItem[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api<RiskItem[]>('/insights/renewal-risk').then(setItems).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => filter === 'ALL' ? items : items.filter((x) => x.risk === filter), [items, filter]);
  const high = items.filter((x) => x.risk === 'HIGH').length;
  const medium = items.filter((x) => x.risk === 'MEDIUM').length;

  return (
    <>
      <PageHeader title="Renewal Intelligence" subtitle="Explainable risk signals to help your team prioritize customer retention." />
      <ErrorBanner message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Subscriptions analysed" value={items.length} />
        <Stat label="High-risk subscriptions" value={high} tone="red" />
        <Stat label="Medium-risk subscriptions" value={medium} tone="amber" />
      </div>
      <div className="card mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Retention action queue</h2>
            <p className="mt-1 text-sm text-slate-500">Rule-based score from recorded status, renewal settings and overdue invoices; not an ML guarantee.</p>
          </div>
          <select className="input max-w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All risk levels</option>
            <option value="HIGH">High risk</option>
            <option value="MEDIUM">Medium risk</option>
            <option value="LOW">Low risk</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {filtered.map((x) => (
            <article key={x.subscriptionId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{x.customer} <span className="font-normal text-slate-500">· {x.plan}</span></div>
                  <div className="text-sm text-slate-500">{x.email} · subscription #{x.subscriptionId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskClass(x.risk)}`}>{x.risk} RISK</span>
                  <span className="text-lg font-bold">{x.score}/100</span>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Signals</h3>
                  {x.reasons.length ? <ul className="mt-1 list-disc pl-5 text-sm">{x.reasons.map((v) => <li key={v}>{v}</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">No risk signals detected.</p>}
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Recommended next steps</h3>
                  {x.recommendedActions.length ? <ul className="mt-1 list-disc pl-5 text-sm">{x.recommendedActions.map((v) => <li key={v}>{v}</li>)}</ul> : <p className="mt-1 text-sm text-slate-500">Continue normal customer care.</p>}
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">Status: {x.status} · Ends: {fmtDate(x.endDate)} · Auto-renew: {x.autoRenew ? 'On' : 'Off'}</div>
            </article>
          ))}
          {!filtered.length && <p className="py-8 text-center text-sm text-slate-500">No subscriptions match this filter.</p>}
        </div>
      </div>
    </>
  );
}