import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, RefreshCw, Check } from 'lucide-react';

/**
 * Penilaian jawaban Asisten AI.
 *  👍 Tepat        → disimpan sebagai jawaban terverifikasi (dipakai ulang untuk pertanyaan sama/mirip).
 *  👎 Kurang tepat → tulis catatan (opsional) lalu "Tanyakan ulang": AI menjawab ulang lebih teliti.
 */
export default function AnswerFeedback({ feedback, busy, onCorrect, onRetry }) {
  const [wrong, setWrong] = useState(false);
  const [note, setNote] = useState('');

  if (feedback === 'up') {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <Check size={14} /> Disimpan sebagai jawaban terverifikasi
      </p>
    );
  }
  if (feedback === 'down') {
    return <p className="mt-2 text-xs text-gray-400">Dinilai kurang tepat — jawaban perbaikan ada di bawah.</p>;
  }

  return (
    <div className="mt-2.5 space-y-2">
      {!wrong ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Jawaban ini tepat?</span>
          <button type="button" disabled={busy} onClick={onCorrect}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            aria-label="Jawaban tepat">
            <ThumbsUp size={13} /> Tepat
          </button>
          <button type="button" disabled={busy} onClick={() => setWrong(true)}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 hover:border-rose-400 hover:text-rose-600 transition-colors"
            aria-label="Jawaban kurang tepat">
            <ThumbsDown size={13} /> Kurang tepat
          </button>
        </div>
      ) : (
        <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); onRetry(note.trim()); }}>
          <input
            autoFocus
            aria-label="Apa yang kurang tepat"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Apa yang kurang tepat? (opsional) mis. periode salah, angka tidak sesuai"
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-accent)] disabled:opacity-50">
              <RefreshCw size={13} /> Tanyakan ulang
            </button>
            <button type="button" onClick={() => setWrong(false)} className="rounded-lg px-2 py-1.5 text-xs text-gray-500">Batal</button>
          </div>
        </form>
      )}
    </div>
  );
}
