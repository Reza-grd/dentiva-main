import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { useToast } from '../common/ToastNotification';
import LoadingSpinner from '../common/LoadingSpinner';

const SoapTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ treatment_type: '', keluhan: '', pemeriksaan_fisik: '', diagnosa: '', terapi: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('soap_templates')
        .select('*')
        .order('treatment_type');
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat template: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tmpl) => {
    setEditingId(tmpl.id);
    setFormData({
      treatment_type: tmpl.treatment_type,
      keluhan: tmpl.keluhan || '',
      pemeriksaan_fisik: tmpl.pemeriksaan_fisik || '',
      diagnosa: tmpl.diagnosa || '',
      terapi: tmpl.terapi || '',
    });
    setIsAdding(false);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ treatment_type: '', keluhan: '', pemeriksaan_fisik: '', diagnosa: '', terapi: '' });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ treatment_type: '', keluhan: '', pemeriksaan_fisik: '', diagnosa: '', terapi: '' });
  };

  const handleSave = async () => {
    if (!formData.treatment_type.trim()) {
      toast.error('Nama tindakan/template tidak boleh kosong');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        treatment_type: formData.treatment_type.trim(),
        keluhan: formData.keluhan.trim(),
        pemeriksaan_fisik: formData.pemeriksaan_fisik.trim(),
        diagnosa: formData.diagnosa.trim(),
        terapi: formData.terapi.trim(),
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from('soap_templates').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Template berhasil diperbarui');
      } else {
        const { error } = await supabase.from('soap_templates').insert(payload);
        if (error) throw error;
        toast.success('Template berhasil ditambahkan');
      }
      
      handleCancel();
      await loadTemplates();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Yakin ingin menghapus template SOAP untuk "${type}"?`)) return;
    try {
      const { error } = await supabase.from('soap_templates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Template berhasil dihapus');
      await loadTemplates();
    } catch (err) {
      toast.error('Gagal menghapus template: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Template SOAP Rekam Medis</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola template teks default untuk catatan medis (Keluhan, Pemeriksaan Fisik, Diagnosa, Terapi) berdasarkan tindakan.</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={handleAdd} className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl flex items-center gap-2 hover:bg-[var(--color-accent-secondary)] transition-colors text-sm font-semibold">
            <Plus size={16} /> Tambah Template
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
          <h3 className="font-bold text-lg mb-4">{isAdding ? 'Tambah Template SOAP Baru' : 'Edit Template SOAP'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nama Template / Jenis Tindakan</label>
              <input 
                type="text" 
                value={formData.treatment_type} 
                onChange={(e) => setFormData({...formData, treatment_type: e.target.value})}
                className="w-full glass-input px-4 py-2 rounded-xl"
                placeholder="Contoh: Pencabutan Gigi Anak..."
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Default Keluhan (S)</label>
              <textarea 
                value={formData.keluhan} 
                onChange={(e) => setFormData({...formData, keluhan: e.target.value})}
                className="w-full glass-input px-4 py-2 rounded-xl"
                rows="2"
                placeholder="Gigi goyang..."
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Default Pemeriksaan Fisik (O)</label>
              <textarea 
                value={formData.pemeriksaan_fisik} 
                onChange={(e) => setFormData({...formData, pemeriksaan_fisik: e.target.value})}
                className="w-full glass-input px-4 py-2 rounded-xl"
                rows="2"
                placeholder="Gigi tampak..."
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Default Diagnosa (A)</label>
              <textarea 
                value={formData.diagnosa} 
                onChange={(e) => setFormData({...formData, diagnosa: e.target.value})}
                className="w-full glass-input px-4 py-2 rounded-xl"
                rows="2"
                placeholder="Nekrosis..."
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Default Terapi/Tindakan (P)</label>
              <textarea 
                value={formData.terapi} 
                onChange={(e) => setFormData({...formData, terapi: e.target.value})}
                className="w-full glass-input px-4 py-2 rounded-xl"
                rows="2"
                placeholder="Ekstraksi..."
                disabled={saving}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={handleCancel} disabled={saving} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-semibold flex items-center gap-2">
                <X size={16} /> Batal
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl font-semibold flex items-center gap-2">
                {saving ? 'Menyimpan...' : <><Save size={16} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {templates.map(tmpl => (
          <div key={tmpl.id} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(tmpl)} className="p-1.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)]/20">
                <Edit size={14} />
              </button>
              <button onClick={() => handleDelete(tmpl.id, tmpl.treatment_type)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                <Trash2 size={14} />
              </button>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">{tmpl.treatment_type}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 uppercase">Keluhan (S):</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{tmpl.keluhan || '-'}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 uppercase">Pemeriksaan Fisik (O):</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{tmpl.pemeriksaan_fisik || '-'}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 uppercase">Diagnosa (A):</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{tmpl.diagnosa || '-'}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 uppercase">Terapi (P):</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{tmpl.terapi || '-'}</p>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && !loading && (
          <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            Belum ada template SOAP.
          </div>
        )}
      </div>
    </div>
  );
};

export default SoapTemplates;
