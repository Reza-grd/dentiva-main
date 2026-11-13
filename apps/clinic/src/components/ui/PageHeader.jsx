import React from 'react';

/**
 * Judul halaman standar Dentiva: judul (serif, tenang), keterangan singkat, dan aksi di kanan.
 * Tanpa ikon dekoratif, emoji, atau tanda seru. Maksimal satu aksi utama (tombol navy solid).
 *
 *   <PageHeader title="Data Pasien" description="Seluruh pasien terdaftar di klinik" actions={<Button …/>} />
 */
export default function PageHeader({ title, description, actions, eyebrow, back, className = '' }) {
  return (
    <header className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {back}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-medium text-gold">{eyebrow}</p>}
          <h1 className="text-[26px] font-medium leading-tight text-text-primary md:text-[30px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
