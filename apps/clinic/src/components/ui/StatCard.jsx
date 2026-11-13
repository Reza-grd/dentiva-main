import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

/**
 * Kartu angka standar: label kecil, angka besar berlebar seragam, keterangan/tren opsional.
 * Tanpa lingkaran ikon atau ikon samar di latar. Warna hanya untuk makna (tone).
 *
 *   tone: 'netral' | 'baik' | 'waspada' | 'bahaya' — mewarnai angka & tren, bukan kartu.
 *   trend: angka persen (+/-) → panah naik/turun; trendLabel: "dari bulan lalu".
 */
const NADA = {
  netral: 'text-text-primary',
  baik: 'text-emerald-700 dark:text-emerald-400',
  waspada: 'text-amber-700 dark:text-amber-400',
  bahaya: 'text-red-700 dark:text-red-400',
};

export default function StatCard({ label, value, hint, tone = 'netral', trend, trendLabel = 'dari bulan lalu', loading, onClick, className = '' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex h-full flex-col rounded-2xl border border-border bg-card p-4 text-left ${onClick ? 'transition-colors hover:border-accent-primary/40' : ''} ${className}`}
    >
      {loading ? (
        <div className="w-full animate-pulse space-y-2.5" aria-label="Memuat">
          <div className="h-3 w-1/2 rounded bg-border" />
          <div className="h-6 w-2/3 rounded bg-border" />
        </div>
      ) : (
        <>
          <span className="text-xs font-medium text-text-muted">{label}</span>
          <span className={`mt-1 truncate text-[22px] font-semibold leading-tight tabular-nums ${NADA[tone] || NADA.netral}`}>{value}</span>
          {trend !== undefined && trend !== null && (
            <span className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(trend)}% {trendLabel}
            </span>
          )}
          {hint && <span className="mt-1 text-xs text-text-muted">{hint}</span>}
        </>
      )}
    </Tag>
  );
}
