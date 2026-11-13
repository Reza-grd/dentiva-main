import React from 'react';

import QueueDisplayLinks from '../settings/QueueDisplayLinks';

/** Menu "Layar Antrean": admin & resepsionis membuat/mencabut tautan layar TV ruang tunggu. */
export default function QueueDisplayPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-[26px] md:text-[30px] font-medium leading-tight text-text-primary">Layar Antrean</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tampilkan antrean di TV ruang tunggu. Buka tautan di TV atau komputer layar tersebut — tanpa login.
          </p>
        </div>
      </div>
      <QueueDisplayLinks />
    </div>
  );
}
