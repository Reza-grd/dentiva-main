import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { usePermission } from '../../contexts/PermissionsContext';
import { Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const EMRHistory = ({ visitId, onRestoreComplete }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const { hasPermission } = usePermission();

  useEffect(() => {
    fetchHistory();
  }, [visitId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_record_versions')
        .select(`
          id, version, changed_at, reason, restored_from,
          users:changed_by ( nama )
        `)
        .eq('visit_id', visitId)
        .order('version', { ascending: false });

      if (error) throw error;
      setHistory(data);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil riwayat EMR');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version) => {
    if (!window.confirm(`Apakah Anda yakin ingin memulihkan EMR ke versi ${version}?`)) return;
    
    try {
      const { data, error } = await supabase.rpc('restore_emr_version', {
        p_visit_id: visitId,
        p_version: version,
        p_reason: `Dipulihkan secara manual dari versi ${version}`
      });

      if (error) throw error;
      
      toast.success('EMR berhasil dipulihkan!');
      fetchHistory();
      if (onRestoreComplete) onRestoreComplete();
    } catch (err) {
      console.error(err);
      toast.error('Gagal memulihkan versi EMR');
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Memuat riwayat...</div>;
  if (history.length === 0) return <div className="p-4 text-gray-500">Belum ada riwayat perubahan.</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Clock size={20} /> Riwayat Perubahan EMR
      </h3>
      <div className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
        {history.map((item, index) => (
          <div key={item.id} className="pl-6 relative">
            <div className="absolute w-3 h-3 bg-[var(--color-accent)] rounded-full -left-[6.5px] top-1.5 ring-4 ring-white dark:ring-gray-800"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">
                  Versi {item.version}
                  {item.restored_from && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={12} /> Hasil Pemulihan v{item.restored_from}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Oleh: {item.users?.nama || 'Sistem'} pada {new Date(item.changed_at).toLocaleString('id-ID')}
                </p>
                {item.reason && <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">"{item.reason}"</p>}
              </div>
              
              {/* Cannot restore the absolute latest (current) version to itself */}
              {index !== 0 && hasPermission('emr.update') && (
                <button
                  onClick={() => handleRestore(item.version)}
                  className="p-2 text-gray-500 hover:text-[var(--color-accent)] hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Pulihkan ke versi ini"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EMRHistory;
