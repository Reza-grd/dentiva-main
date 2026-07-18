import React from 'react';

const ScheduleVisitForm = ({ scheduleForm, setScheduleForm, allDoctors }) => {
  return (
    <div className="space-y-4">
      {/* Dokter */}
      <div>
        <label htmlFor="dokter_id" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Dokter Gigi <span className="text-red-500">*</span></label>
        <select 
          id="dokter_id"
          required
          value={scheduleForm.dokter_id || ''}
          onChange={e => setScheduleForm({ ...scheduleForm, dokter_id: e.target.value })}
          className="glass-input w-full px-4 py-2.5 rounded-xl appearance-none text-sm focus:ring-2 focus:ring-[var(--color-primary)]"
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
          <label htmlFor="tanggal_kunjungan" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Tanggal Kunjungan <span className="text-red-500">*</span></label>
          <input 
            type="date"
            id="tanggal_kunjungan"
            required
            value={scheduleForm.tanggal_kunjungan || ''}
            onChange={e => setScheduleForm({ ...scheduleForm, tanggal_kunjungan: e.target.value })}
            className="glass-input w-full px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Jam */}
        <div>
          <label htmlFor="jam_kunjungan" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Jam Kunjungan <span className="text-red-500">*</span></label>
          <input 
            type="time" 
            id="jam_kunjungan"
            required
            value={scheduleForm.jam_kunjungan || ''}
            onChange={e => setScheduleForm({ ...scheduleForm, jam_kunjungan: e.target.value })}
            className="glass-input w-full px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Keluhan */}
      <div>
        <label htmlFor="keluhan" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Keluhan / Catatan</label>
        <textarea 
          id="keluhan"
          value={scheduleForm.keluhan || ''}
          onChange={e => setScheduleForm({ ...scheduleForm, keluhan: e.target.value })}
          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm resize-none h-24 focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Keluhan atau alasan kunjungan..."
        />
      </div>
    </div>
  );
};

export default ScheduleVisitForm;
