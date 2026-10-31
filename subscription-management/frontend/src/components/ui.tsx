import { ReactNode } from 'react';
import { Paged } from '../types';

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
export const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const daysUntil = (d: string) =>
  Math.round((new Date(d + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const badge: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700', PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700', OVERDUE: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-slate-200 text-slate-700', CANCELLED: 'bg-slate-200 text-slate-500',
};
export const Badge = ({ v }: { v: string }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge[v] ?? 'bg-slate-100'}`}>{v}</span>
);

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="text-2xl leading-none text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export const ErrorBanner = ({ message }: { message?: string }) =>
  message ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div> : null;

export const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <input className="input max-w-xs" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
);

export function Pagination<T>({ data, onPage }: { data: Paged<T> | null; onPage: (p: number) => void }) {
  if (!data) return null;
  const { number, totalPages, totalElements } = data.page;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>{totalElements} result{totalElements === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost btn-sm" disabled={number === 0} onClick={() => onPage(number - 1)}>Previous</button>
        <span>Page {totalPages === 0 ? 0 : number + 1} of {totalPages}</span>
        <button className="btn-ghost btn-sm" disabled={number + 1 >= totalPages} onClick={() => onPage(number + 1)}>Next</button>
      </div>
    </div>
  );
}

/** Wrapper that renders loading / empty states for a table body. */
export function TableShell({ heads, loading, empty, children }: { heads: string[]; loading: boolean; empty: boolean; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50"><tr>{heads.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {loading && <p className="p-6 text-center text-sm text-slate-500">Loading…</p>}
      {!loading && empty && <p className="p-6 text-center text-sm text-slate-500">No records found.</p>}
    </div>
  );
}

export const Stat = ({ label, value, hint, tone = 'indigo' }: { label: string; value: string | number; hint?: string; tone?: 'indigo' | 'emerald' | 'red' | 'amber' }) => {
  const bar = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500' }[tone];
  return (
    <div className="card relative overflow-hidden p-5">
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
};
