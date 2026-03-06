import React, { createContext, useContext, useState, ReactNode } from 'react';
import { landingTranslations, Language, TranslationKey } from './LandingTranslations';

interface LandingTranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: typeof landingTranslations.en;
}

const LandingTranslationContext = createContext<LandingTranslationContextType | undefined>(undefined);

export const useLandingTranslation = () => {
  const context = useContext(LandingTranslationContext);
  if (!context) {
    throw new Error('useLandingTranslation must be used within LandingTranslationProvider');
  }
  return context;
};

interface LandingTranslationProviderProps {
  children: ReactNode;
}

export const LandingTranslationProvider: React.FC<LandingTranslationProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = landingTranslations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  const translations = landingTranslations[language];

  return (
    <LandingTranslationContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LandingTranslationContext.Provider>
  );
};
