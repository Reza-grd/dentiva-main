import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useDebounced<T>(value: T, delayMs = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

/**
 * State filter/paginasi yang disimpan di URL (?q=&status=&page=), sehingga
 * tampilan bisa dibagikan lewat tautan dan tombol Back bekerja wajar.
 */
export function useUrlState<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(() => {
    const out = {} as Record<K, string | undefined>;
    for (const k of keys) out[k] = params.get(k) ?? undefined;
    return out;
  }, [params, keys]);

  const set = (patch: Partial<Record<K, string | number | undefined | null>>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch) as [string, unknown][]) {
      if (v === undefined || v === null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage && !("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  return { values, set, page };
}
