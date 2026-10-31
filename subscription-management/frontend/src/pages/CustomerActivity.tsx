import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

type Activity = {
  id: number | string;
  customerId?: number | string;
  customerName?: string;
  type?: string;
  action?: string;
  description?: string;
  message?: string;
  createdAt?: string;
  timestamp?: string;
  actorName?: string;
  userName?: string;
};
type Customer = { id: number | string; name?: string; firstName?: string; lastName?: string; email?: string };
type Wrapped<T> = { content?: T[] } | T[];

const unwrap = <T,>(v: Wrapped<T>): T[] => Array.isArray(v) ? v : v.content || [];
const customerName = (c?: Customer) => c?.name || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.email || 'Unknown customer';

export default function CustomerActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Wrapped<Activity>>('/activities?size=500'),
      api<Wrapped<Customer>>('/customers?size=500'),
    ]).then(([activityData, customerData]) => {
      if (!active) return;
      setActivities(unwrap(activityData));
      setCustomers(unwrap(customerData));
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'Unable to load activity history.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const customerById = useMemo(() => new Map(customers.map(c => [String(c.id), c])), [customers]);
  const visible = activities.filter(a => {
    const c = customerById.get(String(a.customerId ?? ''));
    const text = [a.customerName, customerName(c), a.type, a.action, a.description, a.message, a.actorName, a.userName].join(' ').toLowerCase();
    return text.includes(query.toLowerCase());
  }).sort((a, b) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());

  return <div className="space-y-6">
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Account history</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Customer Activity</h1>
      <p className="mt-2 text-sm text-slate-500">A chronological view of customer and subscription events recorded by the system.</p>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-slate-900">Activity timeline</h2><p className="mt-1 text-sm text-slate-500">{visible.length} event{visible.length === 1 ? '' : 's'}</p></div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search events or customers…" aria-label="Search activity" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
      </div>
      {error && <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}<p className="mt-1 text-xs">This page expects a GET /activities endpoint. If your backend does not provide it yet, use the backend activity-log patch in the next step.</p></div>}
      {loading ? <p className="p-10 text-center text-sm text-slate-500">Loading activity…</p> :
        !error && visible.length === 0 ? <div className="p-12 text-center"><p className="font-semibold text-slate-800">No activity recorded yet</p><p className="mt-1 text-sm text-slate-500">Events will appear here once your backend records them.</p></div> :
        <div className="divide-y divide-slate-100">{visible.map(a => {
          const c = customerById.get(String(a.customerId ?? ''));
          const title = a.action || a.type || 'Account event';
          const description = a.description || a.message || 'No additional details';
          const date = a.createdAt || a.timestamp;
          return <div key={a.id} className="flex gap-4 p-5">
            <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-50 text-lg text-indigo-700">•</div>
            <div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><p className="font-semibold text-slate-900">{title}</p><time className="text-xs text-slate-400">{date ? new Date(date).toLocaleString() : 'Date unavailable'}</time></div>
              <p className="mt-1 text-sm text-slate-600">{description}</p>
              <p className="mt-2 text-xs text-slate-400">{a.customerName || customerName(c)}{(a.actorName || a.userName) ? ` · by ${a.actorName || a.userName}` : ''}</p>
            </div>
          </div>;
        })}</div>}
    </div>
  </div>;
}
