import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, getTranslation, getFontFamily } from '../utils/translations';
import { storage } from '../services/storage';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: keyof typeof translations) => string;
  fontFamily: string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ 
  children, 
  initialLanguage = 'ar' 
}) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await storage.getLanguage();
        if (savedLanguage && ['fr', 'en', 'ar'].includes(savedLanguage)) {
          setLanguageState(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };
    loadSavedLanguage();
  }, []);

  useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      setLanguageState(initialLanguage);
    }
  }, [initialLanguage]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await storage.setLanguage(lang);
  };

  const t = (key: keyof typeof translations): string => {
    try {
      return getTranslation(key, language);
    } catch (error) {
      console.warn(`Translation error for key "${key}":`, error);
      return key;
    }
  };

  const isRTL = language === 'ar';

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    fontFamily: getFontFamily(language),
    isRTL,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export { Language };
