import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEME_PALETTES, DEFAULT_PALETTE } from '../config/themePalettes';
import { supabase } from '../services/supabase';

// Terang/gelap disimpan PER AKUN (komputer klinik sering dipakai bergantian).
// Belum login / belum pernah memilih → selalu terang. KEEP IN SYNC: public/theme-init.js
const themeKey = (userId) => `theme:${userId}`;
const readTheme = (userId) => {
  if (!userId) return 'light';
  try {
    return localStorage.getItem(themeKey(userId)) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const ThemeContext = createContext();

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Kunci lama bersama ('theme') membuat pengguna baru ikut tema gelap pengguna sebelumnya.
    try {
      localStorage.removeItem('theme');
    } catch {
      /* storage tidak tersedia */
    }
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id ?? null;
      setUserId(id);
      setTheme(readTheme(id));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      setTheme(readTheme(id));
    });
    return () => subscription?.unsubscribe();
  }, []);

  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem('colorTheme') || DEFAULT_PALETTE;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply dark mode class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const palette = THEME_PALETTES[colorTheme] || THEME_PALETTES[DEFAULT_PALETTE];

    root.style.setProperty('--color-accent', palette.accent);
    root.style.setProperty('--color-accent-secondary', palette.accentSecondary);
    root.style.setProperty('--color-dark-base', palette.darkBase);

    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const setThemeMode = (mode) => {
    const next = mode === 'dark' ? 'dark' : 'light';
    setTheme(next);
    if (userId) {
      try {
        localStorage.setItem(themeKey(userId), next);
      } catch {
        /* storage tidak tersedia */
      }
    }
  };

  const toggleTheme = () => setThemeMode(theme === 'dark' ? 'light' : 'dark');

  const activePalette = THEME_PALETTES[colorTheme] || THEME_PALETTES[DEFAULT_PALETTE];

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      isDarkMode: theme === 'dark',
      setThemeMode,
      toggleTheme, 
      colorTheme, 
      setColorTheme, 
      THEME_PALETTES,
      // Backward compatibility alias for primaryColor
      primaryColor: activePalette.accent 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

