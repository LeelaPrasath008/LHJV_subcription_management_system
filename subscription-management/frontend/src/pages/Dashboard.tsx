import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { Alerts, Dashboard as Data } from '../types';
import { Badge, daysUntil, ErrorBanner, fmtDate, fmtMoney, PageHeader, Stat } from '../components/ui';

const COLORS: Record<string, string> = { ACTIVE: '#10b981', EXPIRED: '#94a3b8', CANCELLED: '#f87171' };

export default function Dashboard() {
  const [d, setD] = useState<Data | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api<Data>('/dashboard'), api<Alerts>('/alerts')])
      .then(([a, b]) => { setD(a); setAlerts(b); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!d || !alerts) return <p className="text-slate-500">Loading dashboard…</p>;

  const pie = Object.entries(d.statusCounts).map(([name, value]) => ({ name, value }));
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Subscription health at a glance" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total subscriptions" value={d.totalSubscriptions} hint={`${d.totalCustomers} customers`} />
        <Stat label="Active subscriptions" value={d.activeSubscriptions} tone="emerald" hint={`${d.expiringSoon} expiring within 7 days`} />
        <Stat label="Monthly recurring revenue" value={fmtMoney(d.mrr)} tone="indigo" hint="Active plans, normalised per month" />
        <Stat label="Overdue payments" value={d.overdueCount} tone="red" hint={`${fmtMoney(d.overdueAmount)} outstanding`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Revenue collected (last 6 months)</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={d.revenueByMonth}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Subscriptions by status</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                  {pie.map((p) => <Cell key={p.name} fill={COLORS[p.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            {pie.map((p) => <span key={p.name} className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[p.name] }} />{p.name}</span>)}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Expiring within 7 days</h2>
          {alerts.expiring.length === 0 && <p className="text-sm text-slate-500">No subscriptions are about to expire.</p>}
          {alerts.expiring.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <div><div className="font-medium">{s.customer.name}</div><div className="text-xs text-slate-500">{s.plan.name} · ends {fmtDate(s.endDate)}</div></div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{daysUntil(s.endDate)}d left</span>
            </div>
          ))}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Overdue invoices</h2>
          {alerts.overdue.length === 0 && <p className="text-sm text-slate-500">No overdue payments.</p>}
          {alerts.overdue.slice(0, 6).map((i) => (
            <div key={i.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <div><div className="font-medium">{i.subscription.customer.name}</div><div className="text-xs text-slate-500">{i.number} · due {fmtDate(i.dueDate)}</div></div>
              <div className="text-right"><div className="font-semibold">{fmtMoney(i.amount)}</div><Badge v="OVERDUE" /></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
