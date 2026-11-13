import React from 'react';

/**
 * Tampilan kosong yang informatif: apa yang belum ada, kenapa penting, dan langkah berikutnya.
 *
 *   <EmptyState icon={Users} title="Belum ada kunjungan" description="Grafik muncul setelah kunjungan pertama tercatat."
 *               action={<button …>Tambah kunjungan</button>} />
 */
export default function EmptyState({ icon: Icon, title, description, action, compact = false, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-10'} ${className}`}>
      {Icon && (
        <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-border text-text-muted">
          <Icon size={18} />
        </span>
      )}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
