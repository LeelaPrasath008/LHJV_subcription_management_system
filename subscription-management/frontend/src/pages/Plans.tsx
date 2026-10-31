import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { Plan } from '../types';
import { Badge, ErrorBanner, Field, fmtMoney, Modal, PageHeader } from '../components/ui';

const empty: Plan = { name: '', description: '', price: 0, billingCycle: 'MONTHLY', features: '', active: true };
const unit = { MONTHLY: 'month', QUARTERLY: 'quarter', YEARLY: 'year' } as const;

export default function Plans() {
  const { isAdmin } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');

  const load = useCallback(() => {
    api<Plan[]>('/plans').then(setPlans).catch((e) => setPageError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const v: Record<string, string> = {};
    if (!editing.name.trim()) v.name = 'Name is required';
    if (!(Number(editing.price) > 0)) v.price = 'Price must be greater than 0';
    setErrors(v);
    if (Object.keys(v).length) return;
    try {
      await api(editing.id ? `/plans/${editing.id}` : '/plans', { method: editing.id ? 'PUT' : 'POST', body: { ...editing, price: Number(editing.price) } });
      setEditing(null); load();
    } catch (err) {
      const ae = err as ApiError;
      setErrors(ae.fields ?? {}); setFormError(ae.fields && Object.keys(ae.fields).length ? '' : ae.message);
    }
  };

  const remove = async (p: Plan) => {
    if (!confirm(`Delete plan "${p.name}"?`)) return;
    try { await api(`/plans/${p.id}`, { method: 'DELETE' }); setPageError(''); load(); }
    catch (err) { setPageError((err as Error).message); }
  };

  return (
    <>
      <PageHeader title="Plans" subtitle="Pricing, billing cycles and features"
        action={isAdmin ? <button className="btn-primary" onClick={() => { setEditing({ ...empty }); setErrors({}); setFormError(''); }}>+ New plan</button> : undefined} />
      <ErrorBanner message={pageError} />
      {loading && <p className="text-slate-500">Loading…</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div key={p.id} className={`card flex flex-col p-5 ${p.active ? '' : 'opacity-60'}`}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{p.name}</h3><Badge v={p.active ? 'ACTIVE' : 'EXPIRED'} /></div>
            <p className="mt-1 min-h-[2.5rem] text-sm text-slate-500">{p.description}</p>
            <p className="my-3"><span className="text-3xl font-bold">{fmtMoney(p.price)}</span><span className="text-sm text-slate-500"> / {unit[p.billingCycle]}</span></p>
            <ul className="mb-4 flex-1 space-y-1 text-sm">
              {(p.features ?? '').split('\n').filter(Boolean).map((f) => <li key={f}>✓ {f}</li>)}
            </ul>
            {isAdmin && (
              <div className="flex gap-2">
                <button className="btn-ghost btn-sm" onClick={() => { setEditing({ ...p }); setErrors({}); setFormError(''); }}>Edit</button>
                <button className="btn-danger btn-sm" onClick={() => remove(p)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!isAdmin && <p className="mt-4 text-xs text-slate-500">Only administrators can create or change plans.</p>}

      {editing && (
        <Modal title={editing.id ? 'Edit plan' : 'New plan'} onClose={() => setEditing(null)}>
          <form onSubmit={save} noValidate>
            <ErrorBanner message={formError} />
            <Field label="Name *" error={errors.name}><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Description" error={errors.description}><input className="input" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price *" error={errors.price}><input className="input" type="number" min="0" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value as unknown as number })} /></Field>
              <Field label="Billing cycle" error={errors.billingCycle}>
                <select className="input" value={editing.billingCycle} onChange={(e) => setEditing({ ...editing, billingCycle: e.target.value as Plan['billingCycle'] })}>
                  <option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option>
                </select>
              </Field>
            </div>
            <Field label="Features (one per line)" error={errors.features}><textarea className="input h-24" value={editing.features ?? ''} onChange={(e) => setEditing({ ...editing, features: e.target.value })} /></Field>
            <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active (available for new subscriptions)</label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
