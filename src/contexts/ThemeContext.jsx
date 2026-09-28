import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEME_PALETTES, DEFAULT_PALETTE } from '../config/themePalettes';

const ThemeContext = createContext();

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

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
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const palette = THEME_PALETTES[colorTheme] || THEME_PALETTES[DEFAULT_PALETTE];

    root.style.setProperty('--color-accent', palette.accent);
    root.style.setProperty('--color-accent-secondary', palette.accentSecondary);
    root.style.setProperty('--color-dark-base', palette.darkBase);

    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const activePalette = THEME_PALETTES[colorTheme] || THEME_PALETTES[DEFAULT_PALETTE];

  return (
    <ThemeContext.Provider value={{ 
      theme, 
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

