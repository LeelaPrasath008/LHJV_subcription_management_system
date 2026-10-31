import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

type Customer = { id: number | string; name?: string; firstName?: string; lastName?: string; email?: string };
type Subscription = { id: number; customerId?: number | string; customer?: Customer; plan?: { name?: string }; planName?: string; endDate?: string; autoRenew?: boolean; status?: string };
type Invoice = { id: number; customerId?: number | string; customer?: Customer; amount?: number; total?: number; status?: string; dueDate?: string; invoiceNumber?: string };
type Wrapped<T> = { content?: T[] } | T[];
type Reminder = { id: string; title: string; customer: string; detail: string; dateLabel: string; kind: 'Renewal' | 'Payment'; urgency: number; action: string };

const unwrap = <T,>(v: Wrapped<T>): T[] => Array.isArray(v) ? v : v.content || [];
const daysUntil = (date?: string) => {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
};
const nameOf = (c?: Customer, id?: number | string) => c?.name || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.email || (id != null ? `Customer #${id}` : 'Unknown customer');
const currency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const overdue = (i: Invoice) => {
  const status = String(i.status || '').toLowerCase();
  const days = daysUntil(i.dueDate);
  return !['paid', 'cancelled', 'canceled', 'void'].includes(status) && days !== null && days < 0;
};

export default function Reminders() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<'All' | 'Renewal' | 'Payment'>('All');
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Wrapped<Subscription>>('/subscriptions?size=500'),
      api<Wrapped<Invoice>>('/invoices?size=500'),
      api<Wrapped<Customer>>('/customers?size=500'),
    ]).then(([s, i, c]) => {
      if (!active) return;
      const customerMap = new Map(unwrap(c).map(x => [String(x.id), x]));
      setCustomers(unwrap(c));
      setSubs(unwrap(s).map(x => ({ ...x, customer: x.customer || customerMap.get(String(x.customerId)) })));
      setInvoices(unwrap(i).map(x => ({ ...x, customer: x.customer || customerMap.get(String(x.customerId)) })));
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load reminders.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const reminders = useMemo(() => {
    const rows: Reminder[] = [];
    subs.forEach(s => {
      const days = daysUntil(s.endDate);
      if (days !== null && days >= 0 && days <= 30 && !['cancelled', 'canceled'].includes(String(s.status || '').toLowerCase())) {
        rows.push({
          id: `renewal-${s.id}`, title: days === 0 ? 'Subscription ends today' : `Renewal in ${days} day${days === 1 ? '' : 's'}`,
          customer: nameOf(s.customer, s.customerId), detail: `${s.plan?.name || s.planName || 'Subscription'} · #${s.id}`,
          dateLabel: s.endDate || '', kind: 'Renewal', urgency: days <= 7 ? 1 : 2,
          action: s.autoRenew === false ? 'Confirm renewal intent' : 'Send renewal reminder',
        });
      }
    });
    invoices.filter(overdue).forEach(i => {
      const days = daysUntil(i.dueDate) ?? 0;
      rows.push({
        id: `payment-${i.id}`, title: `Payment overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`,
        customer: nameOf(i.customer, i.customerId), detail: `${i.invoiceNumber || `Invoice #${i.id}`} · ${currency(Number(i.amount ?? i.total ?? 0))}`,
        dateLabel: i.dueDate || '', kind: 'Payment', urgency: 0, action: 'Follow up on outstanding invoice',
      });
    });
    return rows.sort((a, b) => a.urgency - b.urgency || a.dateLabel.localeCompare(b.dateLabel));
  }, [subs, invoices]);

  const visible = reminders.filter(r => (kind === 'All' || kind === r.kind) && !done.includes(r.id));
  const overdueCount = reminders.filter(r => r.kind === 'Payment').length;
  const renewalCount = reminders.filter(r => r.kind === 'Renewal').length;

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Follow-up workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Reminders</h1><p className="mt-2 text-sm text-slate-500">A working queue of upcoming renewals and overdue payments based on your current records.</p></div>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-3">
      <Summary label="Open reminders" value={visible.length} note="Not marked complete in this session" />
      <Summary label="Upcoming renewals" value={renewalCount} note="Within the next 30 days" />
      <Summary label="Overdue payments" value={overdueCount} note="Unpaid invoices past due date" />
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">Follow-up queue</h2><p className="mt-1 text-sm text-slate-500">Marking complete is temporary and resets when this page reloads.</p></div><select value={kind} onChange={e => setKind(e.target.value as typeof kind)} aria-label="Filter reminder type" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>All</option><option>Renewal</option><option>Payment</option></select></div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading reminders…</div> : visible.length === 0 ? <div className="p-12 text-center"><p className="font-semibold text-slate-800">You're all caught up</p><p className="mt-1 text-sm text-slate-500">No open reminders match this filter.</p></div> :
        <div className="divide-y divide-slate-100">{visible.map(r => <div key={r.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-bold ${r.kind === 'Payment' ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}>{r.kind === 'Payment' ? '$' : '↻'}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{r.title}</p><span className={`rounded-full px-2 py-1 text-xs font-medium ${r.kind === 'Payment' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>{r.kind}</span></div><p className="mt-1 text-sm text-slate-600">{r.customer} · {r.detail}</p><p className="mt-1 text-sm font-medium text-indigo-700">Suggested action: {r.action}</p></div><div className="flex items-center gap-3 md:flex-col md:items-end"><span className="text-xs text-slate-400">{r.dateLabel}</span><button onClick={() => setDone(prev => [...prev, r.id])} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Mark complete</button></div></div>)}</div>}
    </section>
  </div>;
}
function Summary({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>;
}
