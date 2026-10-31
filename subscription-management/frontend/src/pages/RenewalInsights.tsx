import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

type Customer = { id: number; name?: string; firstName?: string; lastName?: string; email?: string };
type Plan = { id: number; name?: string; price?: number; billingCycle?: string };
type Subscription = {
  id: number;
  customerId?: number | string;
  customer?: Customer;
  planId?: number | string;
  plan?: Plan;
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
  status?: string;
};
type Invoice = {
  id: number;
  customerId?: number | string;
  customer?: Customer;
  subscriptionId?: number | string;
  amount?: number;
  total?: number;
  status?: string;
  dueDate?: string;
  invoiceDate?: string;
  invoiceNumber?: string;
};
type Paged<T> = { content: T[] };

type RiskItem = {
  subscription: Subscription;
  customerName: string;
  planName: string;
  daysToRenewal: number | null;
  risk: number;
  reasons: string[];
  action: string;
  overdueAmount: number;
};

const money = (n: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number.isFinite(n) ? n : 0);

function displayCustomer(c?: Customer, fallbackId?: number | string) {
  const full = [c?.firstName, c?.lastName].filter(Boolean).join(' ').trim();
  return c?.name || full || c?.email || (fallbackId != null ? `Customer #${fallbackId}` : 'Unknown customer');
}

function dayDifference(date?: string) {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
}

function isOverdue(invoice: Invoice) {
  const status = String(invoice.status || '').toLowerCase();
  const days = dayDifference(invoice.dueDate);
  return !['paid', 'cancelled', 'canceled', 'void'].includes(status) && days !== null && days < 0;
}

function calculateRisk(sub: Subscription, invoices: Invoice[]): RiskItem {
  const days = dayDifference(sub.endDate);
  const related = invoices.filter(i =>
    String(i.subscriptionId ?? '') === String(sub.id) ||
    (sub.customerId != null && String(i.customerId ?? i.customer?.id ?? '') === String(sub.customerId))
  );
  const overdue = related.filter(isOverdue);
  const overdueAmount = overdue.reduce((sum, i) => sum + Number(i.amount ?? i.total ?? 0), 0);
  const reasons: string[] = [];
  let score = 0;

  if (String(sub.status || '').toLowerCase() === 'expired' || (days !== null && days < 0)) {
    score += 35;
    reasons.push('Subscription has expired or passed its end date');
  } else if (days !== null && days <= 7) {
    score += 30;
    reasons.push(`Renewal is ${days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`}`);
  } else if (days !== null && days <= 30) {
    score += 18;
    reasons.push(`Renewal is due in ${days} days`);
  }

  if (overdue.length) {
    score += Math.min(45, 20 + overdue.length * 5);
    reasons.push(`${overdue.length} overdue invoice${overdue.length === 1 ? '' : 's'} (${money(overdueAmount)})`);
  }

  if (sub.autoRenew === false) {
    score += 15;
    reasons.push('Automatic renewal is turned off');
  }

  if (!reasons.length) reasons.push('No urgent renewal or payment signals detected');
  score = Math.min(100, score);

  const action = overdue.length
    ? 'Contact customer about overdue payment'
    : days !== null && days < 0
      ? 'Review expired subscription and contact customer'
      : sub.autoRenew === false && days !== null && days <= 30
        ? 'Confirm renewal intent with customer'
        : days !== null && days <= 30
          ? 'Send renewal reminder'
          : 'Monitor account';

  return {
    subscription: sub,
    customerName: displayCustomer(sub.customer, sub.customerId),
    planName: sub.plan?.name || `Plan #${sub.planId ?? '—'}`,
    daysToRenewal: days,
    risk: score,
    reasons,
    action,
    overdueAmount,
  };
}

function riskLabel(score: number) {
  if (score >= 60) return { label: 'High', cls: 'bg-rose-100 text-rose-700' };
  if (score >= 30) return { label: 'Medium', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Low', cls: 'bg-emerald-100 text-emerald-700' };
}

export default function RenewalIntelligence() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      api<Paged<Subscription> | Subscription[]>('/subscriptions?size=500'),
      api<Paged<Invoice> | Invoice[]>('/invoices?size=500'),
      api<Paged<Customer> | Customer[]>('/customers?size=500'),
    ]).then(([subsData, invoiceData, customerData]) => {
      if (!alive) return;
      const unwrap = <T,>(value: Paged<T> | T[]): T[] => Array.isArray(value) ? value : value.content || [];
      const subs = unwrap(subsData);
      const invs = unwrap(invoiceData);
      const custs = unwrap(customerData);
      const byId = new Map(custs.map(c => [String(c.id), c]));
      setSubscriptions(subs.map(s => ({
        ...s,
        customer: s.customer || byId.get(String(s.customerId)),
      })));
      setInvoices(invs);
      setCustomers(custs);
    }).catch(e => {
      if (alive) setError(e instanceof Error ? e.message : 'Could not load renewal data.');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => subscriptions.map(s => calculateRisk(s, invoices))
    .sort((a, b) => b.risk - a.risk), [subscriptions, invoices]);

  const visible = items.filter(item => {
    const level = riskLabel(item.risk).label;
    const matchesFilter = filter === 'All' || level === filter;
    const search = `${item.customerName} ${item.planName} ${item.action}`.toLowerCase();
    return matchesFilter && search.includes(query.toLowerCase());
  });

  const high = items.filter(i => i.risk >= 60).length;
  const medium = items.filter(i => i.risk >= 30 && i.risk < 60).length;
  const upcoming = items.filter(i => i.daysToRenewal !== null && i.daysToRenewal >= 0 && i.daysToRenewal <= 30).length;
  const overdueCount = invoices.filter(isOverdue).length;
  const overdueTotal = invoices.filter(isOverdue).reduce((sum, i) => sum + Number(i.amount ?? i.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Proactive subscription care</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Renewal Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            A transparent, rule-based view of subscriptions that may need attention. Scores are explainable signals, not predictions from an AI model.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{customers.length}</span> customers in view
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<p className="mt-1 text-xs">Check that the backend is running and these endpoints are available to your account.</p></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="High risk" value={high} note="Score 60–100" icon="!" tone="rose" />
        <Metric title="Medium risk" value={medium} note="Score 30–59" icon="↗" tone="amber" />
        <Metric title="Renewals in 30 days" value={upcoming} note="Based on subscription end dates" icon="◷" tone="indigo" />
        <Metric title="Overdue invoices" value={overdueCount} note={money(overdueTotal) + ' outstanding'} icon="$" tone="emerald" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Attention queue</h2>
            <p className="mt-1 text-sm text-slate-500">Prioritized by renewal timing, overdue invoices and auto-renew settings.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input aria-label="Search customers or plans" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search customer or plan…" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            <select aria-label="Filter risk" value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              {['All', 'High', 'Medium', 'Low'].map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading subscription and invoice data…</div> :
          visible.length === 0 ? <div className="p-12 text-center"><p className="font-semibold text-slate-800">No matching subscriptions</p><p className="mt-1 text-sm text-slate-500">Try another filter or search term.</p></div> :
          <div className="divide-y divide-slate-100">
            {visible.map(item => {
              const badge = riskLabel(item.risk);
              return <article key={item.subscription.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.5fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{item.customerName}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label} risk</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.planName} · Subscription #{item.subscription.id}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.daysToRenewal === null ? 'No end date available' : item.daysToRenewal < 0 ? `${Math.abs(item.daysToRenewal)} days past end date` : item.daysToRenewal === 0 ? 'Ends today' : `Ends in ${item.daysToRenewal} days`}</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Why it is flagged</p>
                  <ul className="space-y-1">{item.reasons.map(reason => <li key={reason} className="flex gap-2 text-sm text-slate-600"><span className="text-indigo-500">•</span><span>{reason}</span></li>)}</ul>
                  <p className="mt-2 text-sm font-medium text-indigo-700">Next step: {item.action}</p>
                </div>
                <div className="flex items-center gap-3 lg:justify-end">
                  <div className="text-right"><p className="text-xs text-slate-400">Risk score</p><p className="text-2xl font-bold text-slate-900">{item.risk}<span className="text-sm font-medium text-slate-400">/100</span></p></div>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.risk >= 60 ? 'bg-rose-500' : item.risk >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${item.risk}%` }} /></div>
                </div>
              </article>;
            })}
          </div>}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          Risk score uses available end dates, invoice due dates/statuses and auto-renew flags. Confirm data with the customer before taking action.
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, note, icon, tone }: { title: string; value: number; note: string; icon: string; tone: 'rose' | 'amber' | 'indigo' | 'emerald' }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{title}</p><span className={`grid h-9 w-9 place-items-center rounded-xl font-bold ${tones[tone]}`}>{icon}</span></div>
    <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{note}</p>
  </div>;
}
