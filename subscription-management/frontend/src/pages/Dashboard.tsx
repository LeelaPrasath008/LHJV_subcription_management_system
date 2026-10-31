import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Alerts, Dashboard as Data } from '../types';
import { Badge, daysUntil, ErrorBanner, fmtDate, fmtMoney, PageHeader } from '../components/ui';

const COLORS: Record<string, string> = { ACTIVE: '#10b981', EXPIRED: '#cbd5e1', CANCELLED: '#fb7185' };

function Metric({ label, value, hint, icon, tone }: { label: string; value: string | number; hint: string; icon: string; tone: string }) {
  return <div className="card group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-[30px]">{value}</p></div>
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${tone}`}>{icon}</span>
    </div>
    <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{hint}</p>
  </div>;
}

export default function Dashboard() {
  const [d, setD] = useState<Data | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api<Data>('/dashboard'), api<Alerts>('/alerts')])
      .then(([a, b]) => { setD(a); setAlerts(b); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <><PageHeader title="Your overview" subtitle="A clear picture of your subscription business." /><ErrorBanner message={error} /><div className="card p-6"><p className="text-sm text-slate-600">The dashboard could not load its latest data. Check that the backend is running and you are signed in, then refresh this page.</p><button className="btn-ghost mt-4" onClick={() => window.location.reload()}>Try again</button></div></>;
  if (!d || !alerts) return <div className="space-y-5"><div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(n => <div key={n} className="card h-36 animate-pulse bg-slate-100" />)}</div><div className="card h-80 animate-pulse bg-slate-100" /></div>;

  const pie = Object.entries(d.statusCounts).map(([name, value]) => ({ name, value }));
  const hasRevenue = d.revenueByMonth.some(x => x.revenue > 0);
  return <>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <PageHeader title="Good to see you" subtitle="Here’s what’s happening across your subscription business." />
      <div className="flex flex-wrap gap-2">
        <Link className="btn-ghost" to="/customers"><span className="text-indigo-600">＋</span> Add customer</Link>
        <Link className="btn-primary" to="/subscriptions"><span>↗</span> Manage subscriptions</Link>
      </div>
    </div>

    <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Business snapshot</p><span className="text-xs text-slate-400">Live application data</span></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Monthly recurring revenue" value={fmtMoney(d.mrr)} hint="Normalized monthly value of active plans" icon="$" tone="bg-indigo-50 text-indigo-600" />
      <Metric label="Active subscriptions" value={d.activeSubscriptions} hint={`${d.expiringSoon} renewal${d.expiringSoon === 1 ? '' : 's'} in the next 7 days`} icon="↻" tone="bg-emerald-50 text-emerald-600" />
      <Metric label="Total customers" value={d.totalCustomers} hint={`${d.totalSubscriptions} subscriptions recorded`} icon="♙" tone="bg-violet-50 text-violet-600" />
      <Metric label="Overdue balance" value={fmtMoney(d.overdueAmount)} hint={`${d.overdueCount} invoice${d.overdueCount === 1 ? '' : 's'} need attention`} icon="!" tone="bg-rose-50 text-rose-600" />
    </div>

    <div className="mt-7 grid gap-5 xl:grid-cols-5">
      <section className="card p-5 sm:p-6 xl:col-span-3">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-bold text-slate-900">Revenue performance</h2><p className="mt-1 text-xs text-slate-500">Payments collected over the last six months</p></div>
          <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">6-month view</span>
        </div>
        <div className="h-64">
          {hasRevenue ? <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.22} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 5" stroke="#edf0f6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} width={54} />
              <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,.08)' }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#revenueFill)" strokeWidth={3} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer> : <div className="flex h-full flex-col items-center justify-center rounded-xl bg-slate-50 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-indigo-500 shadow-sm">↗</span><p className="text-sm font-semibold text-slate-700">Your revenue story starts here</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Once payments are recorded, your revenue trend will appear here.</p><Link to="/invoices" className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800">View invoices →</Link></div>}
        </div>
      </section>

      <section className="card p-5 sm:p-6 xl:col-span-2">
        <div className="mb-4"><h2 className="font-bold text-slate-900">Subscription health</h2><p className="mt-1 text-xs text-slate-500">Current status distribution</p></div>
        {pie.reduce((sum, p) => sum + p.value, 0) > 0 ? <>
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">{pie.map((p) => <Cell key={p.name} fill={COLORS[p.name] ?? '#818cf8'} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-slate-900">{d.totalSubscriptions}</span><span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Total</span></div>
          </div>
          <div className="space-y-3">{pie.map(p => <div key={p.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[p.name] ?? '#818cf8' }} />{p.name.charAt(0) + p.name.slice(1).toLowerCase()}</span><span className="font-bold text-slate-800">{p.value}</span></div>)}</div>
        </> : <div className="flex h-56 flex-col items-center justify-center text-center"><span className="text-3xl text-slate-300">◌</span><p className="mt-3 text-sm font-semibold text-slate-700">No subscription data yet</p><p className="mt-1 text-xs text-slate-500">Create your first subscription to see health metrics.</p><Link className="mt-3 text-xs font-bold text-indigo-600" to="/subscriptions">Get started →</Link></div>}
      </section>
    </div>

    <div className="mb-3 mt-8 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Needs your attention</p><span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-[10px] font-bold text-slate-600">{alerts.expiring.length + alerts.overdue.length} items</span></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">↻</span><div><h2 className="text-sm font-bold text-slate-900">Upcoming renewals</h2><p className="mt-0.5 text-xs text-slate-500">Subscriptions ending within 7 days</p></div></div><Link to="/subscriptions" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">View all →</Link></div>
        {alerts.expiring.length === 0 ? <div className="px-5 py-8 text-center"><p className="text-sm font-semibold text-slate-700">No urgent renewals</p><p className="mt-1 text-xs text-slate-500">You’re clear for the next seven days.</p></div> : alerts.expiring.slice(0, 5).map(s => <div key={s.id} className="flex items-center justify-between gap-3 border-b border-slate-50 px-5 py-3.5 last:border-0 hover:bg-slate-50/70"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{s.customer.name}</p><p className="mt-1 truncate text-xs text-slate-500">{s.plan.name} · ends {fmtDate(s.endDate)}</p></div><span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700">{daysUntil(s.endDate)}d left</span></div>)}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">$</span><div><h2 className="text-sm font-bold text-slate-900">Overdue invoices</h2><p className="mt-0.5 text-xs text-slate-500">Payments that need follow-up</p></div></div><Link to="/invoices" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">View invoices →</Link></div>
        {alerts.overdue.length === 0 ? <div className="px-5 py-8 text-center"><p className="text-sm font-semibold text-slate-700">No overdue invoices</p><p className="mt-1 text-xs text-slate-500">Great work—there are no overdue payments to chase.</p></div> : alerts.overdue.slice(0, 5).map(i => <div key={i.id} className="flex items-center justify-between gap-3 border-b border-slate-50 px-5 py-3.5 last:border-0 hover:bg-slate-50/70"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{i.subscription.customer.name}</p><p className="mt-1 truncate text-xs text-slate-500">{i.number} · due {fmtDate(i.dueDate)}</p></div><div className="shrink-0 text-right"><p className="text-sm font-bold text-slate-900">{fmtMoney(i.amount)}</p><Badge v="OVERDUE" /></div></div>)}
      </section>
    </div>
    <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 sm:flex-row sm:items-center sm:px-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl text-indigo-600 shadow-sm">✦</span><div><p className="text-sm font-bold text-slate-900">Keep your subscription business moving</p><p className="mt-1 text-xs text-slate-500">Add customers, set up plans and keep renewals on track.</p></div></div>
      <div className="flex gap-2"><Link to="/plans" className="btn-ghost btn-sm">Explore plans</Link><Link to="/customers" className="btn-primary btn-sm">Add a customer →</Link></div>
    </div>
  </>;
}
