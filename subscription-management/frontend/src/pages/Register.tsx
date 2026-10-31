import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ErrorBanner, Field } from '../components/ui';

export default function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (fullName.trim().length < 2) { setError('Enter your full name'); return; }
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username.trim())) { setError('Username must be 3–30 characters and use only letters, numbers, dots, underscores or hyphens'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setBusy(true);
    try { await register(username.trim(), fullName.trim(), password); nav('/'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">S</div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-slate-500">Join SubscriptIQ to manage subscriptions</p>
        </div>
        <ErrorBanner message={error} />
        <Field label="Full name"><input className="input" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" required maxLength={80} /></Field>
        <Field label="Username"><input className="input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={30} /></Field>
        <Field label="Password"><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} /></Field>
        <Field label="Confirm password"><input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required minLength={8} /></Field>
        <p className="mb-3 text-xs text-slate-500">New accounts receive Staff access. Only an administrator can grant Admin access.</p>
        <button className="btn-primary mt-2 w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="mt-5 text-center text-sm text-slate-600">Already have an account? <Link className="font-semibold text-indigo-600 hover:underline" to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
