import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Alerts } from '../types';
import { daysUntil, fmtDate, fmtMoney } from './ui';

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/customers', label: 'Customers' },
  { to: '/plans', label: 'Plans' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/reports', label: 'Reports', admin: true },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const loc = useLocation();

  useEffect(() => {
    setOpen(false); setBell(false);
    api<Alerts>('/alerts').then(setAlerts).catch(() => undefined);
  }, [loc.pathname]);

  const count = (alerts?.expiring.length ?? 0) + (alerts?.overdue.length ?? 0);

  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 p-5 text-slate-200 transition lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center gap-2 text-xl font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">S</span> SubscriptIQ
        </div>
        <nav className="space-y-1">
          {nav.filter((n) => !n.admin || isAdmin).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button className="btn-ghost btn-sm lg:hidden" onClick={() => setOpen(true)}>Menu</button>
          <div className="hidden lg:block" />
          <div className="relative flex items-center gap-3">
            <button className="btn-ghost btn-sm" onClick={() => setBell(!bell)}>
              Alerts {count > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-white">{count}</span>}
            </button>
            {bell && (
              <div className="absolute right-0 top-10 z-30 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                {count === 0 && <p className="p-3 text-sm text-slate-500">No alerts. All clear.</p>}
                {alerts?.overdue.map((i) => (
                  <div key={'o' + i.id} className="border-b border-slate-100 p-2 text-sm">
                    <span className="font-semibold text-red-600">Overdue</span> {i.number} · {i.subscription.customer.name}
                    <div className="text-xs text-slate-500">{fmtMoney(i.amount)} was due {fmtDate(i.dueDate)}</div>
                  </div>
                ))}
                {alerts?.expiring.map((s) => (
                  <div key={'e' + s.id} className="border-b border-slate-100 p-2 text-sm">
                    <span className="font-semibold text-amber-600">Expiring</span> {s.customer.name} · {s.plan.name}
                    <div className="text-xs text-slate-500">Ends {fmtDate(s.endDate)} ({daysUntil(s.endDate)} days)</div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-right text-sm leading-tight">
              <div className="font-medium">{user?.fullName}</div>
              <div className="text-xs text-slate-500">{user?.role}</div>
            </div>
            <button className="btn-ghost btn-sm" onClick={logout}>Sign out</button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
