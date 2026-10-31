import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, download } from '../api';
import { Report } from '../types';
import { ErrorBanner, fmtMoney, PageHeader, Stat } from '../components/ui';

export default function Reports() {
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { api<Report>('/reports').then(setR).catch((e) => setError(e.message)); }, []);

  const exportCsv = () => download('/reports/invoices.csv', 'invoices.csv').catch((e) => setError(e.message));

  if (error && !r) return <ErrorBanner message={error} />;
  if (!r) return <p className="text-slate-500">Loading reports…</p>;

  return (
    <>
      <PageHeader title="Reports" subtitle="Admin-only revenue and plan analytics"
        action={<button className="btn-ghost" onClick={exportCsv}>Export invoices (CSV)</button>} />
      <ErrorBanner message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Collected" value={fmtMoney(r.paidTotal)} tone="emerald" />
        <Stat label="Pending" value={fmtMoney(r.pendingTotal)} tone="amber" />
        <Stat label="Overdue" value={fmtMoney(r.overdueTotal)} tone="red" />
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-3 font-semibold">Monthly revenue (last 12 months)</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={r.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={11} /><YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => fmtMoney(v)} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">MRR by plan</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={r.planStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="plan" fontSize={12} width={100} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Bar dataKey="mrr" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-3 w-full text-sm"><tbody>
            {r.planStats.map((p) => <tr key={p.plan} className="border-t border-slate-100"><td className="py-1.5">{p.plan}</td><td>{p.subscriptions} active</td><td className="text-right font-medium">{fmtMoney(p.mrr)}</td></tr>)}
          </tbody></table>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Top customers by revenue paid</h2>
          {r.topCustomers.length === 0 && <p className="text-sm text-slate-500">No paid invoices yet.</p>}
          {r.topCustomers.map((c, i) => (
            <div key={c.customer} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <span><span className="mr-2 text-slate-400">#{i + 1}</span>{c.customer}</span><b>{fmtMoney(c.paid)}</b>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
