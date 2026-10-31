import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Customer, Invoice, Paged, Subscription } from '../types';
import { Badge, ErrorBanner, fmtDate, fmtMoney, PageHeader } from '../components/ui';

export default function CustomerProfile() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api<Customer>(`/customers/${id}`),
      api<Paged<Subscription>>('/subscriptions?page=0&size=200'),
      api<Paged<Invoice>>('/invoices?page=0&size=200')
    ]).then(([c, s, i]) => {
      setCustomer(c);
      setSubscriptions(s.content.filter(x => String(x.customer.id) === id));
      setInvoices(i.content.filter(x => String(x.subscription.customer.id) === id));
    }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card animate-pulse p-8 text-sm text-slate-500">Loading customer profile…</div>;
  if (error || !customer) return <><PageHeader title="Customer profile" /><ErrorBanner message={error || 'Customer not found'} /><Link className="btn-ghost" to="/customers">← Back to customers</Link></>;

  const active = subscriptions.filter(s => s.status === 'ACTIVE').length;
  const overdue = invoices.filter(i => i.status === 'OVERDUE');
  const paid = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Link to="/customers" className="mb-3 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800">← All customers</Link>
        <PageHeader title={customer.name} subtitle={customer.company || 'Individual customer'} /></div>
      <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500">Customer ID #{customer.id}</span>
    </div>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="card p-5"><p className="text-xs font-semibold text-slate-500">Subscriptions</p><p className="mt-3 text-3xl font-bold text-slate-900">{subscriptions.length}</p><p className="mt-2 text-xs text-slate-500">{active} currently active</p></div>
      <div className="card p-5"><p className="text-xs font-semibold text-slate-500">Invoices</p><p className="mt-3 text-3xl font-bold text-slate-900">{invoices.length}</p><p className="mt-2 text-xs text-slate-500">All recorded invoices</p></div>
      <div className="card p-5"><p className="text-xs font-semibold text-slate-500">Paid invoice value</p><p className="mt-3 text-2xl font-bold text-emerald-600">{fmtMoney(paid)}</p><p className="mt-2 text-xs text-slate-500">Sum of invoices marked paid</p></div>
      <div className="card p-5"><p className="text-xs font-semibold text-slate-500">Overdue invoices</p><p className="mt-3 text-3xl font-bold text-rose-600">{overdue.length}</p><p className="mt-2 text-xs text-slate-500">{fmtMoney(overdue.reduce((sum, i) => sum + i.amount, 0))} outstanding</p></div>
    </section>

    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-indigo-600">{customer.name.charAt(0).toUpperCase()}</span><div><h2 className="font-bold text-slate-900">Contact information</h2><p className="text-xs text-slate-500">Customer details</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p><p className="mt-1 break-all text-sm font-medium text-slate-800">{customer.email}</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</p><p className="mt-1 text-sm font-medium text-slate-800">{customer.phone || 'Not provided'}</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company</p><p className="mt-1 text-sm font-medium text-slate-800">{customer.company || 'Not provided'}</p></div>
      </div>
    </section>

    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Subscriptions</h2><p className="mt-1 text-xs text-slate-500">Plans and current subscription status for this customer</p></div>
      {subscriptions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No subscriptions recorded for this customer yet.</p> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-slate-50"><tr><th className="th">Plan</th><th className="th">Start date</th><th className="th">End date</th><th className="th">Auto renew</th><th className="th">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{subscriptions.map(s => <tr key={s.id}><td className="td font-semibold text-slate-800">{s.plan.name}</td><td className="td">{fmtDate(s.startDate)}</td><td className="td">{fmtDate(s.endDate)}</td><td className="td">{s.autoRenew ? 'Enabled' : 'Disabled'}</td><td className="td"><Badge v={s.status} /></td></tr>)}</tbody></table></div>}
    </section>

    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Invoice history</h2><p className="mt-1 text-xs text-slate-500">Payments and balances associated with this customer</p></div>
      {invoices.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No invoices recorded for this customer yet.</p> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-slate-50"><tr><th className="th">Invoice</th><th className="th">Plan</th><th className="th">Issue date</th><th className="th">Due date</th><th className="th">Amount</th><th className="th">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.map(i => <tr key={i.id}><td className="td font-semibold text-slate-800">{i.number}</td><td className="td">{i.subscription.plan.name}</td><td className="td">{fmtDate(i.issueDate)}</td><td className="td">{fmtDate(i.dueDate)}</td><td className="td font-semibold">{fmtMoney(i.amount)}</td><td className="td"><Badge v={i.status} /></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
