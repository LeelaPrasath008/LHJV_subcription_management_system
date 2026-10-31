import { createContext, ReactNode, useContext, useState } from 'react';
import { api } from './api';
import { User } from './types';

interface AuthCtx { user: User | null; isAdmin: boolean; login: (u: string, p: string) => Promise<void>; logout: () => void }
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const login = async (username: string, password: string) => {
    const r = await api<{ token: string; username: string; fullName: string; role: User['role'] }>(
      '/auth/login', { method: 'POST', body: { username, password } });
    const u: User = { username: r.username, fullName: r.fullName, role: r.role };
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };
  return <Ctx.Provider value={{ user, isAdmin: user?.role === 'ADMIN', login, logout }}>{children}</Ctx.Provider>;
}
