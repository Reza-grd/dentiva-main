import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Undo2, AlertTriangle, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { aiService } from '../../services/aiService';

/**
 * Kartu usulan Eira Agen. Eira hanya MENGUSULKAN; data baru berubah setelah admin menekan "Setujui".
 * Status kartu disimpan di pesan (parent) lewat onChange: pending | applied | rejected | undone | expired.
 * Server tetap memeriksa admin, pemilik usulan, dan batas 30 menit (EXPIRES_MS hanya untuk tampilan).
 */
export const EXPIRES_MS = 30 * 60 * 1000;

const RISK = {
  rendah: { label: 'Risiko rendah', cls: 'ai-act__risk--low' },
  sedang: { label: 'Perlu dicek', cls: 'ai-act__risk--mid' },
  tinggi: { label: 'Berdampak besar', cls: 'ai-act__risk--high' },
};

/** Halaman tempat hasil tindakan bisa dilihat. */
const LINK = (jenis) => {
  if (jenis.startsWith('pengeluaran')) return { to: '/admin/pengeluaran', label: 'Pengeluaran' };
  if (jenis.startsWith('tindakan')) return { to: '/admin/treatments', label: 'Master Treatment' };
  return { to: '/admin/costing', label: 'Biaya & Modal' };
};

const isExpired = (a) => a.state === 'pending' && a.at && Date.now() - a.at > EXPIRES_MS;

export default function AgentActions({ actions, onChange, onApplied }) {
  const navigate = useNavigate();
  const [busyIds, setBusyIds] = useState([]);
  const patch = (ids, fn) => onChange(actions.map((a) => (ids.includes(a.id) ? { ...a, ...fn(a) } : a)));
  const pending = actions.filter((a) => a.state === 'pending' && !isExpired(a));

  const approve = async (ids) => {
    if (busyIds.length) return;
    setBusyIds(ids);
    patch(ids, () => ({ error: '' }));
    const res = await aiService.applyActions(ids);
    setBusyIds([]);
    if (!res.success) { patch(ids, () => ({ error: res.error })); return; }
    const done = new Map((res.data?.tindakan || []).map((t) => [t.id, t]));
    patch(ids, (a) => ({ state: 'applied', bisaBatal: Boolean(done.get(a.id)?.bisa_batal), error: '' }));
    onApplied?.(actions.filter((a) => ids.includes(a.id)));
  };

  const reject = async (ids) => {
    if (busyIds.length) return;
    setBusyIds(ids);
    const res = await aiService.rejectActions(ids);
    setBusyIds([]);
    if (!res.success) { patch(ids, () => ({ error: res.error })); return; }
    patch(ids, () => ({ state: 'rejected', error: '' }));
  };

  const undo = async (id) => {
    if (busyIds.length) return;
    setBusyIds([id]);
    const res = await aiService.undoAction(id);
    setBusyIds([]);
    if (!res.success) { patch([id], () => ({ error: res.error })); return; }
    patch([id], () => ({ state: 'undone', bisaBatal: false, error: '' }));
  };

  return (
    <div className="ai-acts" role="group" aria-label="Usulan tindakan Eira">
      <p className="ai-acts__lead"><ShieldCheck size={14} /> Eira menyiapkan {actions.length} usulan. Data baru berubah setelah Anda menyetujui.</p>
      {actions.map((a) => {
        const p = a.pratinjau || {};
        const risk = RISK[p.risiko] || RISK.rendah;
        const expired = isExpired(a);
        const state = expired ? 'expired' : a.state;
        const busy = busyIds.includes(a.id);
        const link = LINK(a.jenis || '');
        return (
          <article key={a.id} className={`ai-act ai-act--${state}`} aria-label={p.judul}>
            <header className="ai-act__head">
              <h4>{p.judul || a.jenis}</h4>
              {state === 'pending' && <span className={`ai-act__risk ${risk.cls}`}>{risk.label}</span>}
              {state === 'applied' && <span className="ai-act__badge ai-act__badge--ok"><Check size={12} /> Dijalankan</span>}
              {state === 'rejected' && <span className="ai-act__badge"><X size={12} /> Ditolak</span>}
              {state === 'undone' && <span className="ai-act__badge"><Undo2 size={12} /> Dibatalkan</span>}
              {state === 'expired' && <span className="ai-act__badge"><Clock size={12} /> Kedaluwarsa</span>}
            </header>
            {(p.rincian || []).length > 0 && (
              <ul className="ai-act__lines">{p.rincian.map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
            {(p.peringatan || []).map((w, i) => (
              <p key={i} className="ai-act__warn" role="note"><AlertTriangle size={13} /> {w}</p>
            ))}
            {a.error && <p className="ai-act__error" role="alert">{a.error}</p>}
            <footer className="ai-act__foot">
              {state === 'pending' && (
                <>
                  <button type="button" className="ai-act__btn ai-act__btn--ok" disabled={busy || busyIds.length > 0} onClick={() => approve([a.id])} aria-label={`Setujui: ${p.judul}`}>
                    <Check size={14} /> {busy ? 'Memproses…' : 'Setujui'}
                  </button>
                  <button type="button" className="ai-act__btn" disabled={busyIds.length > 0} onClick={() => reject([a.id])} aria-label={`Tolak: ${p.judul}`}>
                    <X size={14} /> Tolak
                  </button>
                </>
              )}
              {state === 'applied' && (
                <>
                  <button type="button" className="ai-act__btn" onClick={() => navigate(link.to)}>Lihat di {link.label} <ArrowRight size={13} /></button>
                  {a.bisaBatal && (
                    <button type="button" className="ai-act__btn" disabled={busyIds.length > 0} onClick={() => undo(a.id)} aria-label={`Batalkan: ${p.judul}`}>
                      <Undo2 size={13} /> {busy ? 'Membatalkan…' : 'Batalkan'}
                    </button>
                  )}
                </>
              )}
              {state === 'expired' && <span className="ai-act__hint">Minta Eira membuat usulan ini lagi.</span>}
            </footer>
          </article>
        );
      })}
      {pending.length > 1 && (
        <div className="ai-acts__all">
          <button type="button" className="ai-act__btn ai-act__btn--ok" disabled={busyIds.length > 0} onClick={() => approve(pending.map((a) => a.id))}>
            <Check size={14} /> Setujui semua ({pending.length})
          </button>
          <button type="button" className="ai-act__btn" disabled={busyIds.length > 0} onClick={() => reject(pending.map((a) => a.id))}>
            <X size={14} /> Tolak semua
          </button>
          <span className="ai-act__hint">Persetujuan semua bersifat satu paket: bila ada yang gagal, tidak ada yang berubah.</span>
        </div>
      )}
    </div>
  );
}
