import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { useToast } from '../common/ToastNotification';
import LoadingSpinner from '../common/LoadingSpinner';

const TreatmentEducationTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ treatment_type: '', education_text: '', medication_instructions: '' });
  const [keywordsString, setKeywordsString] = useState('');
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
        .from('treatment_education_templates')
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
      education_text: tmpl.education_text || '',
      medication_instructions: tmpl.medication_instructions || '',
    });
    setKeywordsString(tmpl.keywords?.join(', ') || '');
    setIsAdding(false);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ treatment_type: '', education_text: '', medication_instructions: '' });
    setKeywordsString('');
    setIsAdding(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ treatment_type: '', education_text: '', medication_instructions: '' });
    setKeywordsString('');
  };

  const handleSave = async () => {
    if (!formData.treatment_type.trim()) {
      toast.error('Nama tindakan tidak boleh kosong');
      return;
    }
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;

      const keywordsArray = keywordsString
        .split(',')
        .map(k => k.trim().toLowerCase().replace(/\s+/g, ' '))
        .filter(k => k.length > 0 && k !== ' ');

      const payload = {
        treatment_type: formData.treatment_type.trim(),
        education_text: formData.education_text.trim(),
        medication_instructions: formData.medication_instructions.trim(),
        keywords: keywordsArray,
        last_updated_by: userId,
        last_updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from('treatment_education_templates').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Template berhasil diperbarui');
      } else {
        const { error } = await supabase.from('treatment_education_templates').insert(payload);
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
    if (!window.confirm(`Yakin ingin menghapus template edukasi untuk "${type}"?`)) return;
    try {
      const { error } = await supabase.from('treatment_education_templates').delete().eq('id', id);
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Template Edukasi Perawatan</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola template pesan WA edukasi dan panduan obat pasca tindakan.</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={handleAdd} className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl flex items-center gap-2 hover:bg-[var(--color-accent-secondary)] transition-colors text-sm font-semibold">
            <Plus size={16} /> Tambah Template
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
          <h3 className="font-bold text-lg mb-4">{isAdding ? 'Tambah Template Baru' : 'Edit Template'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nama Tindakan (Harus sesuai dengan nama di master treatment)</label>
              <input 
                type="text" 
                value={formData.treatment_type} 
                onChange={(e) => setFormData({...formData, treatment_type: e.target.value})}
                className="w-full glass-input px-4 py-2 rounded-xl"
                placeholder="Contoh: Scaling, Tambal Gigi..."
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Kata Kunci / Keywords (Pisahkan dengan koma)</label>
              <input 
                type="text" 
                value={keywordsString} 
                onChange={(e) => setKeywordsString(e.target.value)}
                className="w-full glass-input px-4 py-2 rounded-xl"
                placeholder="Contoh: cabut, ekstraksi, odontektomi"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">Digunakan untuk fuzzy matching jika nama treatment sedikit berbeda.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Edukasi Umum (Teks WA)</label>
              <textarea 
                value={formData.education_text} 
                onChange={(e) => setFormData({...formData, education_text: e.target.value})}
                className="w-full glass-input px-4 py-2 rounded-xl"
                rows="5"
                placeholder="Yang perlu diperhatikan setelah..."
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Instruksi Obat Tambahan (Opsional)</label>
              <textarea 
                value={formData.medication_instructions} 
                onChange={(e) => setFormData({...formData, medication_instructions: e.target.value})}
                className="w-full glass-input px-4 py-2 rounded-xl"
                rows="3"
                placeholder="[Diisi oleh dokter sesuai resep] atau panduan khusus obat..."
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">{tmpl.treatment_type}</h3>
            {tmpl.keywords && tmpl.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {tmpl.keywords.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs rounded-md">
                    {kw}
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-3 mt-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Edukasi:</span>
                <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-3">{tmpl.education_text || '-'}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Instruksi Obat:</span>
                <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-2">{tmpl.medication_instructions || '-'}</p>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && !loading && (
          <div className="col-span-2 text-center py-10 text-gray-500">
            Belum ada template edukasi.
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentEducationTemplates;
