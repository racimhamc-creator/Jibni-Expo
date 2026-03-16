import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mapTheme: ThemeMode;
  mapStyle: any[];
  toggleMapTheme: () => void;
  setMapTheme: (mode: ThemeMode) => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mapTheme, setMapThemeState] = useState<ThemeMode>('dark');
  const [mapStyle, setMapStyle] = useState<any[]>([]);

  useEffect(() => {
    try {
      const { DARK_MAP_STYLE, LIGHT_MAP_STYLE } = require('../config/mapStyles');
      setMapStyle(mapTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE);
    } catch (e) {
      console.warn('Failed to load map styles:', e);
      setMapStyle([]);
    }
  }, [mapTheme]);

  const toggleMapTheme = useCallback(() => {
    setMapThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const setMapTheme = useCallback((mode: ThemeMode) => {
    setMapThemeState(mode);
  }, []);

  const isDarkMode = mapTheme === 'dark';

  return (
    <ThemeContext.Provider value={{
      mapTheme,
      mapStyle,
      toggleMapTheme,
      setMapTheme,
      isDarkMode,
    }}>
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
