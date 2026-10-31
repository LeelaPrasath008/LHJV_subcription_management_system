const BASE: string = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) { super(message); }
}

const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

function forceLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (location.pathname !== '/login') location.href = '/login';
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }
  if (res.status === 401 && !path.startsWith('/auth/login')) { forceLogout(); throw new ApiError(401, 'Session expired'); }
  if (!res.ok) {
    let data: { message?: string; fieldErrors?: Record<string, string> } = {};
    try { data = await res.json(); } catch { /* no body */ }
    throw new ApiError(res.status, data.message ?? res.statusText, data.fieldErrors ?? {});
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function download(path: string, filename: string) {
  const res = await fetch(BASE + path, { headers: authHeader() });
  if (!res.ok) throw new ApiError(res.status, 'Download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
