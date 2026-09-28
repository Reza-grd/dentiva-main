import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Trash2, Pill, AlertTriangle } from 'lucide-react';
import { prescriptionService } from '../../services/prescriptionService';

/**
 * PrescriptionEntry component allows adding and managing prescriptions for a visit.
 *
 * Props:
 *   prescriptions: Array of prescription objects (obat_id, nama_obat, dosis, frekuensi, qty, harga_satuan)
 *   onChange: Callback when prescriptions array changes
 *   patientAllergies: String containing patient allergies from medical history
 *   disabled: Boolean to lock inputs
 */
const PrescriptionEntry = ({ prescriptions = [], onChange, patientAllergies = '', disabled = false }) => {
  const [masterObat, setMasterObat] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Temporary state for the drug being added
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [dosis, setDosis] = useState('');
  const [frekuensi, setFrekuensi] = useState('');
  const [qty, setQty] = useState('');
  
  const [allergyWarning, setAllergyWarning] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Load master obat on mount
    const fetchMasterObat = async () => {
      const res = await prescriptionService.getActiveObat();
      if (res.success && res.data) {
        setMasterObat(res.data);
      }
    };
    fetchMasterObat();
  }, []);

  // Filter results when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      const q = query.trim().toLowerCase();
      setResults(masterObat.filter(obat => obat.nama_obat.toLowerCase().includes(q)).slice(0, 10));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, masterObat]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkForAllergy = (drugName) => {
    if (!patientAllergies || !drugName) {
      setAllergyWarning(null);
      return;
    }
    const allergiesList = patientAllergies.toLowerCase().split(/[\s,;]+/);
    const drugTokens = drugName.toLowerCase().split(/[\s-]+/);
    
    // Simple intersection check
    const hasConflict = drugTokens.some(token => 
      token.length > 3 && allergiesList.some(a => a.includes(token) || token.includes(a))
    );

    if (hasConflict) {
      setAllergyWarning(`Peringatan: Pasien memiliki riwayat alergi yang mungkin terkait dengan obat ini (${drugName}).`);
    } else {
      setAllergyWarning(null);
    }
  };

  const handleSelectDrug = (obat) => {
    setSelectedDrug(obat);
    setQuery(obat.nama_obat);
    setDosis(obat.dosis_default || '');
    setFrekuensi(obat.frekuensi_default || '');
    setQty('');
    setIsOpen(false);
    checkForAllergy(obat.nama_obat);
  };

  const clearSelection = () => {
    setSelectedDrug(null);
    setQuery('');
    setDosis('');
    setFrekuensi('');
    setQty('');
    setAllergyWarning(null);
  };

  const handleAdd = () => {
    if (!selectedDrug || !qty) return;

    const newPrescription = {
      obat_id: selectedDrug.id,
      nama_obat: selectedDrug.nama_obat,
      dosis,
      frekuensi,
      qty: parseInt(qty, 10),
      harga_satuan: selectedDrug.harga_satuan
    };

    onChange([...prescriptions, newPrescription]);
    clearSelection();
  };

  const handleRemove = (index) => {
    const newArr = [...prescriptions];
    newArr.splice(index, 1);
    onChange(newArr);
  };

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mt-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Pill className="text-[var(--color-accent)]" size={18} />
        <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">E-Prescription (Resep Obat)</h4>
      </div>

      {/* Input Row */}
      {!disabled && (
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-start">
            <div className="relative flex-1" ref={containerRef}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Pilih Obat</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (selectedDrug && e.target.value !== selectedDrug.nama_obat) {
                      setSelectedDrug(null);
                      setAllergyWarning(null);
                    }
                  }}
                  onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
                  placeholder="Cari nama obat..."
                  className="glass-input w-full pl-8 pr-8 py-2 rounded-lg text-sm"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  <ul className="py-1">
                    {results.map((obat) => (
                      <li
                        key={obat.id}
                        onMouseDown={(e) => { e.preventDefault(); handleSelectDrug(obat); }}
                        className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{obat.nama_obat}</p>
                        <p className="text-xs text-gray-500">{obat.satuan} • {obat.dosis_default}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="w-full md:w-32">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Dosis</label>
              <input
                type="text"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
                placeholder="cth: 500mg"
                className="glass-input w-full px-3 py-2 rounded-lg text-sm"
              />
            </div>
            
            <div className="w-full md:w-32">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Frekuensi</label>
              <input
                type="text"
                value={frekuensi}
                onChange={(e) => setFrekuensi(e.target.value)}
                placeholder="cth: 3x1"
                className="glass-input w-full px-3 py-2 rounded-lg text-sm"
              />
            </div>

            <div className="w-full md:w-24">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Jumlah</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Qty"
                min="1"
                className="glass-input w-full px-3 py-2 rounded-lg text-sm"
              />
            </div>

            <div className="w-full md:w-auto self-end">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedDrug || !qty}
                className="w-full md:w-auto h-[38px] px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-[22px]"
              >
                <Plus size={16} /> Tambah
              </button>
            </div>
          </div>
          
          {allergyWarning && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium">
              <AlertTriangle size={16} className="shrink-0" />
              <p>{allergyWarning}</p>
            </div>
          )}
        </div>
      )}

      {/* Added Prescriptions List */}
      {prescriptions.length > 0 && (
        <div className="mt-4 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2 font-medium">Nama Obat</th>
                <th className="px-3 py-2 font-medium">Dosis</th>
                <th className="px-3 py-2 font-medium">Aturan Pakai</th>
                <th className="px-3 py-2 font-medium">Jumlah</th>
                {!disabled && <th className="px-3 py-2 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
              {prescriptions.map((p, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                  <td className="px-3 py-2.5 font-medium">{p.nama_obat}</td>
                  <td className="px-3 py-2.5">{p.dosis || '-'}</td>
                  <td className="px-3 py-2.5">{p.frekuensi || '-'}</td>
                  <td className="px-3 py-2.5">{p.qty}</td>
                  {!disabled && (
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemove(idx)}
                        className="text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PrescriptionEntry;
