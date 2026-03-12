import React, { createContext, useContext, useState, useCallback } from 'react';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '../config/mapStyles';

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

  const toggleMapTheme = useCallback(() => {
    setMapThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const setMapTheme = useCallback((mode: ThemeMode) => {
    setMapThemeState(mode);
  }, []);

  const mapStyle = mapTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
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
