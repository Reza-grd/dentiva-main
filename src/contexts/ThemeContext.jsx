import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  return useContext(ThemeContext);
};

const getSecondaryColor = (hex) => {
  const secondaries = {
    '#3B82F6': '#1D4ED8', // blue -> dark blue
    '#10B981': '#047857', // emerald -> dark emerald
    '#F59E0B': '#D97706', // amber -> dark amber
    '#EF4444': '#B91C1C', // red -> dark red
    '#8B5CF6': '#6D28D9', // violet -> dark violet
    '#EC4899': '#BE185D', // pink -> dark pink
  };
  return secondaries[hex] || hex;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('primaryColor') || '#3B82F6';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply dark mode class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-accent', primaryColor);
    root.style.setProperty('--color-accent-secondary', getSecondaryColor(primaryColor));
    localStorage.setItem('primaryColor', primaryColor);
  }, [primaryColor]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};
