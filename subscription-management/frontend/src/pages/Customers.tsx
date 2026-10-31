import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { usePaged } from '../hooks';
import { Customer } from '../types';
import { ErrorBanner, Field, Modal, PageHeader, Pagination, SearchBox, TableShell } from '../components/ui';

const empty: Customer = { name: '', email: '', phone: '', company: '' };

function validate(c: Customer) {
  const e: Record<string, string> = {};
  if (!c.name.trim()) e.name = 'Name is required';
  if (!c.email.trim()) e.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) e.email = 'Enter a valid email address';
  if (c.phone && !/^[0-9+()\-\s]+$/.test(c.phone)) e.phone = 'Phone may only contain digits, spaces and + ( ) -';
  return e;
}

export default function Customers() {
  const { isAdmin } = useAuth();
  const list = usePaged<Customer>('/customers');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');

  const open = (c: Customer) => { setEditing({ ...c }); setErrors({}); setFormError(''); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const v = validate(editing);
    setErrors(v);
    if (Object.keys(v).length) return;
    try {
      await api(editing.id ? `/customers/${editing.id}` : '/customers', { method: editing.id ? 'PUT' : 'POST', body: editing });
      setEditing(null); list.reload();
    } catch (err) {
      const ae = err as ApiError;
      setErrors(ae.fields ?? {}); setFormError(ae.fields && Object.keys(ae.fields).length ? '' : ae.message);
    }
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    try { await api(`/customers/${c.id}`, { method: 'DELETE' }); setPageError(''); list.reload(); }
    catch (err) { setPageError((err as Error).message); }
  };

  const set = (k: keyof Customer) => (e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing!, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Customers" subtitle="Manage the people and companies you bill"
        action={<button className="btn-primary" onClick={() => open(empty)}>+ New customer</button>} />
      <ErrorBanner message={pageError || list.error} />
      <div className="card">
        <div className="p-4"><SearchBox value={list.q} onChange={list.setQ} placeholder="Search name, email, company…" /></div>
        <TableShell heads={['Name', 'Email', 'Phone', 'Company', '']} loading={list.loading} empty={!list.data?.content.length}>
          {list.data?.content.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="td font-medium">{c.name}</td><td className="td">{c.email}</td>
              <td className="td">{c.phone || '—'}</td><td className="td">{c.company || '—'}</td>
              <td className="td space-x-2 text-right">
                <Link className="btn-ghost btn-sm" to={`/customers/${c.id}`}>View</Link>
                <button className="btn-ghost btn-sm" onClick={() => open(c)}>Edit</button>
                {isAdmin && <button className="btn-danger btn-sm" onClick={() => remove(c)}>Delete</button>}
              </td>
            </tr>
          ))}
        </TableShell>
        <Pagination data={list.data} onPage={list.setPage} />
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit customer' : 'New customer'} onClose={() => setEditing(null)}>
          <form onSubmit={save} noValidate>
            <ErrorBanner message={formError} />
            <Field label="Name *" error={errors.name}><input className="input" value={editing.name} onChange={set('name')} /></Field>
            <Field label="Email *" error={errors.email}><input className="input" type="email" value={editing.email} onChange={set('email')} /></Field>
            <Field label="Phone" error={errors.phone}><input className="input" value={editing.phone ?? ''} onChange={set('phone')} /></Field>
            <Field label="Company" error={errors.company}><input className="input" value={editing.company ?? ''} onChange={set('company')} /></Field>
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
