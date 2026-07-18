import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, User, ChevronRight } from 'lucide-react';
import { patientService } from '../../services/patientService';

const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Execute search
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedTerm || debouncedTerm.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { success, data } = await patientService.searchPatients(debouncedTerm);
      if (success) {
        setResults(data || []);
      } else {
        setResults([]);
      }
      setLoading(false);
    };

    fetchResults();
  }, [debouncedTerm]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handlePatientClick = (patientId) => {
    setIsOpen(false);
    setSearchTerm('');
    navigate(`/pasien/${patientId}`);
  };

  const maxResults = 8;
  const displayResults = results.slice(0, maxResults);
  const hasMore = results.length > maxResults;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md hidden md:block">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Cari pasien (Nama, No. RM, No. WA)..."
          className="w-full pl-10 pr-10 py-2 bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-white dark:focus:bg-gray-900 transition-all text-gray-900 dark:text-white"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setResults([]);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && searchTerm.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
          {loading ? (
            <div className="p-4 flex items-center justify-center text-gray-500 gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Sedang mencari...
            </div>
          ) : displayResults.length > 0 ? (
            <div className="flex flex-col max-h-[60vh] overflow-y-auto">
              {displayResults.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientClick(patient.id)}
                  className="flex items-start justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{patient.nama_lengkap}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[var(--color-accent)] font-medium">{patient.no_rm}</span>
                        {patient.no_wa && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                            <span>{patient.no_wa}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[var(--color-accent)] transition-colors opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              {hasMore && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/pasien?search=${encodeURIComponent(searchTerm)}`);
                  }}
                  className="p-3 text-sm font-semibold text-center text-[var(--color-accent)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  Lihat semua {results.length} hasil
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Tidak ada pasien ditemukan untuk "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
