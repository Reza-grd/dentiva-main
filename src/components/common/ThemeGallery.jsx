import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { THEME_PALETTES } from '../../config/themePalettes';

const ThemeGallery = ({ onSelect, compact = false }) => {
  const { colorTheme, setColorTheme } = useTheme();

  const handleSelect = (paletteId) => {
    setColorTheme(paletteId);
    if (onSelect) onSelect(paletteId);
  };

  const palettes = Object.values(THEME_PALETTES);

  return (
    <div className={`w-full ${compact ? 'space-y-2' : 'space-y-4'}`}>
      {!compact && (
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Galeri Tema & Gradient</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pilih skema warna aksen gradient untuk diterapkan ke seluruh aplikasi.
          </p>
        </div>
      )}

      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'}`}>
        {palettes.map((palette) => {
          const isActive = colorTheme === palette.id;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => handleSelect(palette.id)}
              className={`relative group text-left p-3 rounded-2xl transition-all duration-200 border cursor-pointer ${
                isActive
                  ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30 shadow-md bg-white dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 bg-white/60 dark:bg-gray-850/60 hover:bg-white dark:hover:bg-gray-800'
              }`}
            >
              {/* Preview Gradient Box */}
              <div
                className="w-full h-16 sm:h-20 rounded-xl relative overflow-hidden flex items-end justify-end p-2 transition-transform duration-200 group-hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentSecondary} 100%)`,
                }}
              >
                {/* Visual accents in preview card */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-xs font-bold">
                  Aa
                </div>

                {/* Checkmark Indicator */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-gray-900 shadow-md flex items-center justify-center animate-in fade-in">
                    <Check size={14} className="stroke-[3]" style={{ color: palette.accent }} />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="mt-2.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    {palette.name}
                  </h4>
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: palette.accent }}
                      title={`Accent: ${palette.accent}`}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: palette.accentSecondary }}
                      title={`Secondary: ${palette.accentSecondary}`}
                    />
                  </div>
                </div>
                {isActive && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    Aktif
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeGallery;
