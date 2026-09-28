import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, Megaphone, X } from 'lucide-react';
import { supabase } from '../../services/supabase';

const STYLE = {
  info: { cls: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-100', Icon: Info },
  warning: { cls: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-100', Icon: AlertTriangle },
  critical: { cls: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-100', Icon: Megaphone },
};

const DISMISS_KEY = 'dentiva-dismissed-announcements';

const readDismissed = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

/**
 * Pengumuman dari tim Dentiva (dikelola di Dentiva Console).
 * Dibaca lewat RPC get_active_announcements(); pengumuman kritis tidak bisa ditutup.
 */
const AnnouncementBanner = () => {
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.rpc('get_active_announcements');
      if (!cancelled && !error && Array.isArray(data)) setItems(data);
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const dismiss = (id) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
    } catch {
      /* abaikan */
    }
  };

  const visible = items.filter((a) => a.severity === 'critical' || !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4" aria-live="polite">
      {visible.map((a) => {
        const { cls, Icon } = STYLE[a.severity] ?? STYLE.info;
        return (
          <div key={a.id} role={a.severity === 'critical' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cls}`}>
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-sm whitespace-pre-wrap opacity-90">{a.body}</p>
            </div>
            {a.severity !== 'critical' && (
              <button type="button" onClick={() => dismiss(a.id)} aria-label="Tutup pengumuman" className="rounded p-1 opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;
