import React from 'react';

const ScheduleVisitForm = ({ scheduleForm, setScheduleForm, allDoctors }) => {
  return (
    <div className="space-y-4">
      {/* Dokter */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Dokter Gigi</label>
        <select 
          value={scheduleForm.dokter_id} 
          onChange={e => setScheduleForm({ ...scheduleForm, dokter_id: e.target.value })}
          className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none text-sm"
        >
          <option value="">— Pilih Dokter —</option>
          {allDoctors.map(d => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tanggal */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Tanggal Kunjungan</label>
          <input 
            type="date" 
            value={scheduleForm.tanggal_kunjungan} 
            onChange={e => setScheduleForm({ ...scheduleForm, tanggal_kunjungan: e.target.value })}
            className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        {/* Jam */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Jam Kunjungan</label>
          <input 
            type="time" 
            value={scheduleForm.jam_kunjungan} 
            onChange={e => setScheduleForm({ ...scheduleForm, jam_kunjungan: e.target.value })}
            className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Keluhan */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Keluhan / Catatan</label>
        <textarea 
          value={scheduleForm.keluhan} 
          onChange={e => setScheduleForm({ ...scheduleForm, keluhan: e.target.value })}
          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm resize-none h-24"
          placeholder="Keluhan atau alasan kunjungan..."
        />
      </div>
    </div>
  );
};

export default ScheduleVisitForm;
