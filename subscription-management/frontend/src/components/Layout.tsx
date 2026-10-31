import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Alerts } from '../types';
import { daysUntil, fmtDate, fmtMoney } from './ui';

const nav = [
  { to: '/', label: 'Overview', icon: '◫', end: true, group: 'WORKSPACE' },
  { to: '/customers', label: 'Customers', icon: '♙', group: 'WORKSPACE' },
  { to: '/plans', label: 'Plans & pricing', icon: '◇', group: 'WORKSPACE' },
  { to: '/subscriptions', label: 'Subscriptions', icon: '↻', group: 'WORKSPACE' },
  { to: '/invoices', label: 'Invoices & payments', icon: '▤', group: 'WORKSPACE' },
  { to: '/reports', label: 'Reports & analytics', icon: '▥', admin: true, group: 'INSIGHTS' },
];

const titles: Record<string, string> = {
  '/': 'Overview', '/customers': 'Customers', '/plans': 'Plans & pricing',
  '/subscriptions': 'Subscriptions', '/invoices': 'Invoices & payments', '/reports': 'Reports & analytics',
};

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
    setBell(false);
    api<Alerts>('/alerts').then(setAlerts).catch(() => undefined);
  }, [loc.pathname]);

  const count = (alerts?.expiring.length ?? 0) + (alerts?.overdue.length ?? 0);
  const navItems = nav.filter((n) => !n.admin || isAdmin);
  const currentTitle = titles[loc.pathname] ?? 'SubscriptIQ';

  return (
    <div className="app-shell min-h-screen lg:flex">
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col transform p-5 text-slate-200 transition-transform duration-200 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-9 flex items-center gap-3 px-1">
          <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black text-white">S</span>
          <div>
            <div className="text-[17px] font-bold tracking-tight text-white">Subscript<span className="text-indigo-300">IQ</span></div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">Subscription OS</div>
          </div>
        </div>

        <div className="mb-2 px-3 text-[10px] font-bold tracking-[.18em] text-slate-500">WORKSPACE</div>
        <nav className="space-y-1">
          {navItems.filter(n => n.group === 'WORKSPACE').map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `nav-item group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${isActive ? 'nav-item-active' : 'text-slate-400 hover:bg-white/[.06] hover:text-white'}`}>
              <span className="nav-icon flex h-7 w-7 items-center justify-center rounded-lg text-lg">{n.icon}</span>
              <span>{n.label}</span>
              {n.to === '/subscriptions' && count > 0 && <span className="ml-auto rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">{count}</span>}
            </NavLink>
          ))}
          {isAdmin && <>
            <div className="mb-2 mt-7 px-3 text-[10px] font-bold tracking-[.18em] text-slate-500">INSIGHTS</div>
            {navItems.filter(n => n.group === 'INSIGHTS').map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `nav-item group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${isActive ? 'nav-item-active' : 'text-slate-400 hover:bg-white/[.06] hover:text-white'}`}>
                <span className="nav-icon flex h-7 w-7 items-center justify-center rounded-lg text-lg">{n.icon}</span>{n.label}
              </NavLink>
            ))}
          </>}
        </nav>

        <div className="mt-auto">
          <div className="sidebar-tip mb-4 rounded-2xl p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-200">✦</div>
            <p className="text-xs font-semibold text-white">Keep revenue healthy</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">Review upcoming renewals and overdue invoices every day.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-white/10 px-1 pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-sm font-bold text-white">
              {(user?.fullName ?? 'U').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.fullName}</p>
              <p className="mt-0.5 text-[10px] capitalize text-slate-400">{user?.role?.toLowerCase() ?? 'Member'}</p>
            </div>
            <button className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" onClick={logout} title="Sign out" aria-label="Sign out">↗</button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="topbar sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button className="btn-ghost btn-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">SUBSCRIPTION MANAGEMENT</p>
              <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900">{currentTitle}</h1>
            </div>
          </div>
          <div className="relative flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Workspace active
            </div>
            <button className={`relative flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-lg transition hover:bg-slate-50 ${bell ? 'border-indigo-300' : 'border-slate-200'}`} onClick={() => setBell(!bell)} aria-label="Toggle alerts">
              ♧
              {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-bold text-white">{count}</span>}
            </button>
            {bell && (
              <div className="absolute right-0 top-12 z-30 max-h-96 w-[min(340px,90vw)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                <div className="flex items-center justify-between px-2 pb-2"><h3 className="font-bold text-slate-900">Action required</h3><span className="text-xs text-slate-400">{count} alerts</span></div>
                {count === 0 && <p className="p-4 text-sm text-slate-500">You’re all caught up. No active alerts.</p>}
                {alerts?.overdue.map((i) => (
                  <div key={'o' + i.id} className="rounded-xl p-3 hover:bg-rose-50">
                    <span className="text-xs font-bold text-rose-600">OVERDUE INVOICE</span><p className="mt-1 text-sm font-semibold text-slate-800">{i.subscription.customer.name}</p>
                    <div className="text-xs text-slate-500">{i.number} · {fmtMoney(i.amount)} due {fmtDate(i.dueDate)}</div>
                  </div>
                ))}
                {alerts?.expiring.map((s) => (
                  <div key={'e' + s.id} className="rounded-xl p-3 hover:bg-amber-50">
                    <span className="text-xs font-bold text-amber-600">RENEWAL APPROACHING</span><p className="mt-1 text-sm font-semibold text-slate-800">{s.customer.name}</p>
                    <div className="text-xs text-slate-500">{s.plan.name} · ends {fmtDate(s.endDate)} ({daysUntil(s.endDate)} days)</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:px-10 lg:py-8"><Outlet /></main>
        <footer className="px-6 pb-6 text-center text-[11px] text-slate-400">SubscriptIQ · Subscription operations, made clearer.</footer>
      </div>
    </div>
  );
}
