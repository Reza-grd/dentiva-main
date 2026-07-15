import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { searchICD10, findICD10ByCode } from '../../data/icd10Dental';

/**
 * ICD10Picker — Searchable autocomplete component for ICD-10 dental codes.
 *
 * Props:
 *   value    {string}   — current code string (e.g. "K02.1") or empty string
 *   onChange {function} — called with { code, description } or null when cleared
 *   disabled {boolean}  — locks input when true
 *   id       {string}   — optional HTML id for the input (for accessibility)
 */
const ICD10Picker = ({ value = '', onChange, disabled = false, id }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Resolve selected entry from current code value
  const selectedEntry = value ? findICD10ByCode(value) : null;

  // Search whenever query changes
  useEffect(() => {
    if (query.trim().length >= 1) {
      setResults(searchICD10(query, 10));
      setIsOpen(true);
      setActiveIndex(-1);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (entry) => {
    onChange && onChange(entry);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    onChange && onChange(null);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} className="relative">
      {/* Selected badge OR search input */}
      {selectedEntry && !isOpen ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 glass-input px-3 py-2 rounded-lg text-sm bg-[var(--color-accent)]/5 border-[var(--color-accent)]/30">
            <span className="font-mono font-bold text-[var(--color-accent)] text-xs shrink-0">
              {selectedEntry.code}
            </span>
            <span className="text-gray-700 dark:text-gray-300 truncate text-xs">
              {selectedEntry.description}
            </span>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
              title="Hapus kode ICD-10"
            >
              <X size={14} />
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                setQuery(selectedEntry.code);
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors shrink-0"
              title="Ubah kode ICD-10"
            >
              <Search size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim().length >= 1 && setIsOpen(true)}
            disabled={disabled}
            placeholder="Cari kode ICD-10 atau nama diagnosa..."
            className="glass-input w-full pl-8 pr-3 py-2 rounded-lg text-sm"
            autoComplete="off"
          />
          {query && !disabled && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          <ul ref={listRef} role="listbox" className="py-1">
            {results.map((entry, idx) => (
              <li
                key={entry.code}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(entry); }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                  idx === activeIndex
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                }`}
              >
                <span className={`font-mono font-bold text-xs shrink-0 mt-0.5 ${
                  idx === activeIndex ? 'text-[var(--color-accent)]' : 'text-[var(--color-accent)]/80'
                }`}>
                  {entry.code}
                </span>
                <span className="text-xs leading-snug">{entry.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No results */}
      {isOpen && query.trim().length >= 1 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
          <p className="px-3 py-3 text-xs text-gray-400 text-center">
            Tidak ada kode yang cocok untuk "<span className="font-mono">{query}</span>"
          </p>
        </div>
      )}
    </div>
  );
};

export default ICD10Picker;
