import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { usePaged } from '../hooks';
import { Customer, Paged, Plan, Subscription } from '../types';
import { Badge, daysUntil, ErrorBanner, Field, fmtDate, fmtMoney, Modal, PageHeader, Pagination, SearchBox, TableShell, todayISO } from '../components/ui';

interface Form { id?: number; customerId: string; planId: string; startDate: string; endDate: string; autoRenew: boolean }
const blank = (): Form => ({ customerId: '', planId: '', startDate: todayISO(), endDate: '', autoRenew: true });

export default function Subscriptions() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState('');
  const list = usePaged<Subscription>('/subscriptions', { status });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    api<Paged<Customer>>('/customers?size=200').then((p) => setCustomers(p.content)).catch(() => undefined);
    api<Plan[]>('/plans').then(setPlans).catch(() => undefined);
  }, []);

  const openNew = () => { setForm(blank()); setErrors({}); setFormError(''); };
  const openEdit = (s: Subscription) => {
    setForm({ id: s.id, customerId: String(s.customer.id), planId: String(s.plan.id), startDate: s.startDate, endDate: s.endDate, autoRenew: s.autoRenew });
    setErrors({}); setFormError('');
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const v: Record<string, string> = {};
    if (!form.customerId) v.customerId = 'Select a customer';
    if (!form.planId) v.planId = 'Select a plan';
    if (!form.startDate) v.startDate = 'Start date is required';
    if (form.endDate && form.startDate && form.endDate < form.startDate) v.endDate = 'End date cannot be before start date';
    setErrors(v);
    if (Object.keys(v).length) return;
    try {
      await api(form.id ? `/subscriptions/${form.id}` : '/subscriptions', {
        method: form.id ? 'PUT' : 'POST',
        body: { customerId: Number(form.customerId), planId: Number(form.planId), startDate: form.startDate, endDate: form.endDate || null, autoRenew: form.autoRenew },
      });
      setForm(null); list.reload();
    } catch (err) {
      const ae = err as ApiError;
      setErrors(ae.fields ?? {}); setFormError(ae.fields && Object.keys(ae.fields).length ? '' : ae.message);
    }
  };

  const act = async (label: string, path: string, method = 'POST') => {
    if (!confirm(label)) return;
    try { await api(path, { method }); setPageError(''); list.reload(); }
    catch (err) { setPageError((err as Error).message); }
  };

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Assign plans, track dates, renew and cancel"
        action={<button className="btn-primary" onClick={openNew}>+ New subscription</button>} />
      <ErrorBanner message={pageError || list.error} />
      <div className="card">
        <div className="flex flex-wrap gap-3 p-4">
          <SearchBox value={list.q} onChange={list.setQ} placeholder="Search customer or plan…" />
          <select className="input max-w-[11rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <TableShell heads={['Customer', 'Plan', 'Start', 'End', 'Status', 'Auto-renew', '']} loading={list.loading} empty={!list.data?.content.length}>
          {list.data?.content.map((s) => {
            const left = daysUntil(s.endDate);
            return (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="td font-medium">{s.customer.name}</td>
                <td className="td">{s.plan.name}<div className="text-xs text-slate-500">{fmtMoney(s.plan.price)} / {s.plan.billingCycle.toLowerCase()}</div></td>
                <td className="td">{fmtDate(s.startDate)}</td>
                <td className="td">{fmtDate(s.endDate)}{s.status === 'ACTIVE' && left <= 7 && <div className="text-xs font-semibold text-amber-600">{left < 0 ? 'Renewal pending' : `${left} day(s) left`}</div>}</td>
                <td className="td"><Badge v={s.status} /></td>
                <td className="td">{s.autoRenew ? 'Yes' : 'No'}</td>
                <td className="td whitespace-nowrap space-x-1 text-right">
                  {s.status !== 'CANCELLED' && <>
                    <button className="btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn-primary btn-sm" onClick={() => act(`Renew ${s.customer.name}'s subscription for another ${s.plan.billingCycle.toLowerCase()} period? An invoice will be generated.`, `/subscriptions/${s.id}/renew`)}>Renew</button>
                    <button className="btn-ghost btn-sm" onClick={() => act('Cancel this subscription?', `/subscriptions/${s.id}/cancel`)}>Cancel</button>
                  </>}
                  {isAdmin && <button className="btn-danger btn-sm" onClick={() => act('Permanently delete this subscription and its invoices?', `/subscriptions/${s.id}`, 'DELETE')}>Delete</button>}
                </td>
              </tr>
            );
          })}
        </TableShell>
        <Pagination data={list.data} onPage={list.setPage} />
      </div>

      {form && (
        <Modal title={form.id ? 'Edit subscription' : 'New subscription'} onClose={() => setForm(null)}>
          <form onSubmit={save} noValidate>
            <ErrorBanner message={formError} />
            <Field label="Customer *" error={errors.customerId}>
              <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </Field>
            <Field label="Plan *" error={errors.planId}>
              <select className="input" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                <option value="">Select plan…</option>
                {plans.filter((p) => p.active || String(p.id) === form.planId).map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price)}/{p.billingCycle.toLowerCase()}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date *" error={errors.startDate}><input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="End date (auto if empty)" error={errors.endDate}><input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
            </div>
            <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} /> Auto-renew at the end of each period</label>
            {!form.id && <p className="text-xs text-slate-500">An invoice for the first billing period is generated automatically.</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
