import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { usePaged } from '../hooks';
import { Invoice, Paged, Subscription } from '../types';
import { Badge, ErrorBanner, Field, fmtDate, fmtMoney, Modal, PageHeader, Pagination, SearchBox, TableShell } from '../components/ui';

const METHODS = ['Cash', 'Card', 'Bank transfer', 'UPI', 'Cheque'];

export default function Invoices() {
  const [status, setStatus] = useState('');
  const list = usePaged<Invoice>('/invoices', { status });
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState('');
  const [genOpen, setGenOpen] = useState(false);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [subId, setSubId] = useState('');
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    if (genOpen) api<Paged<Subscription>>('/subscriptions?size=200&status=ACTIVE').then((p) => setSubs(p.content)).catch(() => undefined);
  }, [genOpen]);

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    try {
      await api(`/invoices/${paying.id}/pay`, { method: 'POST', body: { method, reference: reference.trim() || null } });
      setPaying(null); setReference(''); list.reload();
    } catch (err) { setFormError((err as ApiError).message); }
  };

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!subId) { setFormError('Select a subscription'); return; }
    try { await api(`/invoices/generate/${subId}`, { method: 'POST' }); setGenOpen(false); setSubId(''); list.reload(); }
    catch (err) { setFormError((err as ApiError).message); }
  };

  return (
    <>
      <PageHeader title="Invoices" subtitle="Invoice generation and payment tracking"
        action={<button className="btn-primary" onClick={() => { setGenOpen(true); setFormError(''); }}>+ Generate invoice</button>} />
      <p className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
        Payments are recorded manually. No payment gateway is connected, so no real money is processed here.
      </p>
      <ErrorBanner message={pageError || list.error} />
      <div className="card">
        <div className="flex flex-wrap gap-3 p-4">
          <SearchBox value={list.q} onChange={list.setQ} placeholder="Search invoice # or customer…" />
          <select className="input max-w-[11rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="OVERDUE">Overdue</option>
          </select>
        </div>
        <TableShell heads={['Invoice', 'Customer', 'Plan', 'Amount', 'Issued', 'Due', 'Status', '']} loading={list.loading} empty={!list.data?.content.length}>
          {list.data?.content.map((i) => (
            <tr key={i.id} className="hover:bg-slate-50">
              <td className="td font-mono text-xs">{i.number}</td>
              <td className="td font-medium">{i.subscription.customer.name}</td>
              <td className="td">{i.subscription.plan.name}</td>
              <td className="td font-semibold">{fmtMoney(i.amount)}</td>
              <td className="td">{fmtDate(i.issueDate)}</td>
              <td className="td">{fmtDate(i.dueDate)}</td>
              <td className="td"><Badge v={i.status} />{i.paidDate && <div className="mt-1 text-xs text-slate-500">{fmtDate(i.paidDate)} · {i.paymentMethod}</div>}</td>
              <td className="td text-right">
                {i.status !== 'PAID' && <button className="btn-primary btn-sm" onClick={() => { setPaying(i); setFormError(''); }}>Record payment</button>}
              </td>
            </tr>
          ))}
        </TableShell>
        <Pagination data={list.data} onPage={list.setPage} />
      </div>

      {paying && (
        <Modal title={`Record payment · ${paying.number}`} onClose={() => setPaying(null)}>
          <form onSubmit={pay}>
            <ErrorBanner message={formError} />
            <p className="mb-3 text-sm">Amount received: <b>{fmtMoney(paying.amount)}</b> from {paying.subscription.customer.name}</p>
            <Field label="Payment method"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label="Reference (optional)"><input className="input" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction / cheque number" /></Field>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setPaying(null)}>Cancel</button>
              <button className="btn-primary">Mark as paid</button>
            </div>
          </form>
        </Modal>
      )}

      {genOpen && (
        <Modal title="Generate invoice" onClose={() => setGenOpen(false)}>
          <form onSubmit={generate}>
            <ErrorBanner message={formError} />
            <Field label="Active subscription">
              <select className="input" value={subId} onChange={(e) => setSubId(e.target.value)}>
                <option value="">Select…</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{s.customer.name} — {s.plan.name} ({fmtMoney(s.plan.price)})</option>)}
              </select>
            </Field>
            <p className="text-xs text-slate-500">Creates a pending invoice for one billing period, due in the configured number of days.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setGenOpen(false)}>Cancel</button>
              <button className="btn-primary">Generate</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
