import React from 'react';

// Simple text diff renderer (Green for additions, Red for deletions)
const DiffViewer = ({ fieldName, oldText = '', newText = '' }) => {
  // If exactly the same, or both empty, do not show diff unless requested.
  // We'll just show the side-by-side for simplicity in this V1.
  if (oldText === newText) {
    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">{fieldName.replace('_', ' ')}</p>
        <p className="text-sm text-gray-500 italic">Tidak ada perubahan</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize mb-2">{fieldName.replace('_', ' ')}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg">
          <span className="text-xs font-bold text-red-600 dark:text-red-400 block mb-1">Sebelum</span>
          <p className="text-sm text-red-900 dark:text-red-200 whitespace-pre-wrap">{oldText || '-'}</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-lg">
          <span className="text-xs font-bold text-green-600 dark:text-green-400 block mb-1">Sesudah</span>
          <p className="text-sm text-green-900 dark:text-green-200 whitespace-pre-wrap">{newText || '-'}</p>
        </div>
      </div>
    </div>
  );
};

const EMRCompare = ({ versionData }) => {
  if (!versionData || !versionData.previous_data || !versionData.new_data) {
    return <div className="text-sm text-gray-500">Data perbandingan tidak tersedia untuk versi ini.</div>;
  }

  const fields = ['diagnosa', 'keluhan', 'pemeriksaan_fisik', 'terapi', 'catatan_dokter', 'kode_icd10'];

  return (
    <div className="space-y-4">
      {fields.map(field => (
        <DiffViewer 
          key={field} 
          fieldName={field} 
          oldText={versionData.previous_data[field]} 
          newText={versionData.new_data[field]} 
        />
      ))}
    </div>
  );
};

export default EMRCompare;
