import { useEffect, useState } from 'react';
import { api } from './api';
import { Paged } from './types';

export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

/** Server-side paginated + searchable list. */
export function usePaged<T>(path: string, filters: Record<string, string> = {}, size = 10) {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [data, setData] = useState<Paged<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const fkey = JSON.stringify(filters);

  useEffect(() => { setPage(0); }, [dq, fkey]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ q: dq, page: String(page), size: String(size) });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    api<Paged<T>>(`${path}?${params}`)
      .then((d) => { if (!cancelled) { setData(d); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, dq, page, fkey, tick, size]);

  return { data, loading, error, page, setPage, q, setQ, reload: () => setTick((t) => t + 1) };
}
