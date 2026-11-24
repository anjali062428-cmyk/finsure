import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  theme: 'dark' | 'light';
  is3DEnabled: boolean;
  reducedMotion: boolean;
  toggleTheme: () => void;
  toggle3D: () => void;
  toggleReducedMotion: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('finsure_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    const saved = localStorage.getItem('finsure_reduced_motion');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [is3DEnabled, setIs3DEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('finsure_3d_enabled');
    if (saved !== null) return saved === 'true';
    // If reduced motion is requested, default 3D off to preserve comfort
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('finsure_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('finsure_reduced_motion', String(reducedMotion));
    if (reducedMotion) {
      setIs3DEnabled(false);
    }
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('finsure_3d_enabled', String(is3DEnabled));
  }, [is3DEnabled]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggle3D = () => {
    setIs3DEnabled((prev) => !prev);
  };

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        is3DEnabled,
        reducedMotion,
        toggleTheme,
        toggle3D,
        toggleReducedMotion,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
