import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Trash2, Tag, Stethoscope, AlertCircle } from 'lucide-react';
import { DIAGNOSIS_OPTIONS } from '../../data/clinicalOptions';
import { treatmentService } from '../../services/treatmentService';

const DiagnosisTreatment = ({ clinicalData, setClinicalData, isLocked }) => {
  const [diagSearch, setDiagSearch] = useState('');
  const [treatSearch, setTreatSearch] = useState('');
  const [allTreatments, setAllTreatments] = useState([]);

  useEffect(() => {
    const fetchTreatments = async () => {
      const res = await treatmentService.getAllTreatments();
      if (res.success) {
        setAllTreatments(res.data || []);
      }
    };
    fetchTreatments();
  }, []);

  // Derived state
  const diagnoses = clinicalData.diagnosis_list || [];
  const treatments = clinicalData.treatment_list || [];
  const totalCost = clinicalData.total_treatment_cost || 0;

  // Filtered Options
  const filteredDiagnoses = useMemo(() => {
    if (!diagSearch) return [];
    return DIAGNOSIS_OPTIONS.filter(d => 
      d.code.toLowerCase().includes(diagSearch.toLowerCase()) || 
      d.name.toLowerCase().includes(diagSearch.toLowerCase())
    ).slice(0, 5); // Limit dropdown size
  }, [diagSearch]);

  const filteredTreatments = useMemo(() => {
    if (!treatSearch) return [];
    return allTreatments.filter(t => 
      t.nama_treatment.toLowerCase().includes(treatSearch.toLowerCase())
    ).slice(0, 5);
  }, [treatSearch, allTreatments]);

  // Handlers
  const addDiagnosis = (diag) => {
    if (diagnoses.find(d => d.code === diag.code)) return; // Prevent duplicates
    setClinicalData(prev => ({
      ...prev,
      diagnosis_list: [...(prev.diagnosis_list || []), diag]
    }));
    setDiagSearch(''); // Reset search
  };

  const removeDiagnosis = (code) => {
    setClinicalData(prev => ({
      ...prev,
      diagnosis_list: (prev.diagnosis_list || []).filter(d => d.code !== code)
    }));
  };

  const addTreatment = (treat) => {
    const mappedTreat = {
      id: treat.id,
      name: treat.nama_treatment,
      cost: treat.harga_dasar || 0
    };
    const newList = [...(clinicalData.treatment_list || []), mappedTreat];
    const newTotal = newList.reduce((sum, t) => sum + t.cost, 0);
    setClinicalData(prev => ({
      ...prev,
      treatment_list: newList,
      total_treatment_cost: newTotal
    }));
    setTreatSearch('');
  };

  const removeTreatment = (indexToRemove) => {
    const newList = (clinicalData.treatment_list || []).filter((_, idx) => idx !== indexToRemove);
    const newTotal = newList.reduce((sum, t) => sum + t.cost, 0);
    setClinicalData(prev => ({
      ...prev,
      treatment_list: newList,
      total_treatment_cost: newTotal
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="font-bold text-lg text-gray-900">Diagnosis & Perawatan</h3>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* COLUMN 1: DIAGNOSIS */}
          <div className="flex flex-col h-full border border-gray-100 rounded-xl bg-gray-50/30 overflow-visible">
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2 rounded-t-xl">
              <Stethoscope size={18} className="text-blue-600" />
              <h4 className="font-semibold text-gray-800">Diagnosis (Temuan Masalah)</h4>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              {/* Search/Add Box */}
              <div className="relative mb-4 z-20 print:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Cari kode / nama diagnosis..." 
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                    value={diagSearch}
                    onChange={(e) => setDiagSearch(e.target.value)}
                  />
                </div>
                
                {/* Dropdown Options */}
                {diagSearch && filteredDiagnoses.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-30">
                    {filteredDiagnoses.map((d, i) => (
                      <button 
                        key={i} 
                        onClick={() => addDiagnosis(d)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center group"
                      >
                        <div>
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mr-2">{d.code}</span>
                          <span className="text-gray-700">{d.name}</span>
                        </div>
                        <Plus size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
                {diagSearch && filteredDiagnoses.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-sm text-gray-500 z-30 text-center">
                    Diagnosis tidak ditemukan.
                  </div>
                )}
              </div>

              {/* List of Added Diagnoses */}
              <div className="flex-1 min-h-[150px]">
                {diagnoses.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg py-8">
                    <span className="text-sm">Belum ada diagnosis terpilih</span>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {diagnoses.map((d) => (
                      <li key={d.code} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div>
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded mr-2">{d.code}</span>
                          <span className="text-sm font-medium text-gray-800">{d.name}</span>
                        </div>
                        <button onClick={() => removeDiagnosis(d.code)} className="print:hidden text-gray-400 hover:text-red-500 transition-colors p-1" title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* Additional Notes Field */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-700 block mb-2">Diagnosis lain / catatan tambahan</label>
                <textarea 
                  className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none bg-white" 
                  rows="3"
                  placeholder="Tambahkan catatan diagnosis lainnya di sini..."
                  value={clinicalData.diagnosis_additional_notes || ''}
                  onChange={(e) => setClinicalData(prev => ({ ...prev, diagnosis_additional_notes: e.target.value }))}
                />
              </div>

            </div>
          </div>

          {/* COLUMN 2: PERAWATAN */}
          <div className="flex flex-col h-full border border-gray-100 rounded-xl bg-gray-50/30 overflow-visible">
            <div className="px-4 py-3 border-b border-gray-100 bg-green-50/50 flex items-center gap-2 rounded-t-xl">
              <Tag size={18} className="text-green-600" />
              <h4 className="font-semibold text-gray-800">Perawatan (Tindakan)</h4>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              {isLocked && (
                <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500 text-amber-800 dark:text-amber-400 rounded-r-xl flex items-center gap-2.5">
                  <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                  <span className="text-xs font-semibold leading-relaxed">
                    Invoice sudah dibuat — hubungi resepsionis untuk mengubah perawatan
                  </span>
                </div>
              )}

              {/* Search/Add Box */}
              {!isLocked && (
                <div className="relative mb-4 z-10 print:hidden">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Cari nama tindakan/perawatan..." 
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:border-green-400 focus:ring-1 focus:ring-green-400 outline-none"
                      value={treatSearch}
                      onChange={(e) => setTreatSearch(e.target.value)}
                    />
                  </div>
                  
                  {/* Dropdown Options */}
                  {treatSearch && filteredTreatments.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-20">
                      {filteredTreatments.map((t, i) => (
                        <button 
                          key={i} 
                          onClick={() => addTreatment(t)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center group"
                        >
                          <div className="flex flex-col">
                            <span className="text-gray-800 font-medium">{t.nama_treatment}</span>
                            <span className="text-xs text-green-600 font-semibold">{formatCurrency(t.harga_dasar || 0)}</span>
                          </div>
                          <Plus size={16} className="text-gray-300 group-hover:text-green-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                  {treatSearch && filteredTreatments.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-sm text-gray-500 z-20 text-center">
                      Tindakan tidak ditemukan.
                    </div>
                  )}
                </div>
              )}

              {/* List of Added Treatments */}
              <div className="flex-1 min-h-[150px]">
                {treatments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg py-8">
                    <span className="text-sm">Belum ada tindakan terpilih</span>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {treatments.map((t, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-800">{t.name}</span>
                          <span className="text-xs font-bold text-gray-500">{formatCurrency(t.cost)}</span>
                        </div>
                        {!isLocked && (
                          <button onClick={() => removeTreatment(idx)} className="print:hidden text-gray-400 hover:text-red-500 transition-colors p-1" title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Total Cost Display */}
              {treatments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center bg-green-50/50 p-3 rounded-lg border-green-100 border">
                  <span className="font-semibold text-gray-700 text-sm">Total Estimasi Biaya</span>
                  <span className="font-bold text-lg text-green-700">{formatCurrency(totalCost)}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DiagnosisTreatment;
