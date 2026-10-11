import React from 'react';
import { Monitor } from 'lucide-react';
import QueueDisplayLinks from '../settings/QueueDisplayLinks';

/** Menu "Layar Antrean": admin & resepsionis membuat/mencabut tautan layar TV ruang tunggu. */
export default function QueueDisplayPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-[var(--color-accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Layar Antrean</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tampilkan antrean di TV ruang tunggu. Buka tautan di TV atau komputer layar tersebut — tanpa login.
          </p>
        </div>
      </div>
      <QueueDisplayLinks />
    </div>
  );
}
