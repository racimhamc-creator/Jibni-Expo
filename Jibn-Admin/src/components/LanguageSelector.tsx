import React from 'react';
import { Globe } from 'lucide-react';
import { useLandingTranslation } from '../contexts/LandingTranslationContext';
import { Language } from '../contexts/LandingTranslations';
import './LanguageSelector.css';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLandingTranslation();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  return (
    <div className="language-selector">
      <div className="language-trigger">
        <Globe size={16} />
        <span>{languages.find(lang => lang.code === language)?.flag}</span>
        <span>{languages.find(lang => lang.code === language)?.name}</span>
      </div>
      
      <div className="language-dropdown">
        {languages.map((lang) => (
          <button
            key={lang.code}
            className={`language-option ${language === lang.code ? 'active' : ''}`}
            onClick={() => setLanguage(lang.code)}
          >
            <span className="flag">{lang.flag}</span>
            <span className="name">{lang.name}</span>
            {language === lang.code && <span className="check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
