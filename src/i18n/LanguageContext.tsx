import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslation, getTranslationWithVars } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tv: (key: string, vars: Record<string, string | number>) => string;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'statanalytica-language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') {
        return saved;
      }
      // Try to detect browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('ar')) {
        return 'ar';
      }
    }
    return 'ar'; // Default to Arabic
  });

  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    // Update document direction and language
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    document.body.style.direction = dir;
    document.body.style.textAlign = isRTL ? 'right' : 'left';
    
    // Update font family based on language
    if (isRTL) {
      document.body.style.fontFamily = "'Cairo', 'Tajawal', 'Noto Kufi Arabic', sans-serif";
    } else {
      document.body.style.fontFamily = "'Inter', 'Segoe UI', 'Roboto', sans-serif";
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, language);
  }, [language, dir, isRTL]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const t = (key: string): string => {
    return getTranslation(key, language);
  };

  const tv = (key: string, vars: Record<string, string | number>): string => {
    return getTranslationWithVars(key, language, vars);
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      tv,
      isRTL,
      dir,
      toggleLanguage
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Language Switcher Component
interface LanguageSwitcherProps {
  variant?: 'toggle' | 'dropdown' | 'button' | 'minimal' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'toggle',
  showLabel = true,
  className = ''
}) => {
  const { language, setLanguage, t, isRTL } = useLanguage();

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
        title={t('label.language')}
      >
        <span className="text-lg font-medium">
          {language === 'ar' ? '🇸🇦' : '🇺🇸'}
        </span>
      </button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        className={`text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors ${className}`}
      >
        {language === 'ar' ? 'EN' : 'عربي'}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
      >
        <span className="text-lg">{language === 'ar' ? '🇸🇦' : '🇺🇸'}</span>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {language === 'ar' ? 'العربية' : 'English'}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative group ${className}`}>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <span className="text-lg">{language === 'ar' ? '🇸🇦' : '🇺🇸'}</span>
          {showLabel && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {language === 'ar' ? 'العربية' : 'English'}
            </span>
          )}
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}>
          <button
            onClick={() => setLanguage('ar')}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${language === 'ar' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200'} rounded-t-lg`}
          >
            <span>🇸🇦</span>
            <span>العربية</span>
            {language === 'ar' && <span className="mr-auto">✓</span>}
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${language === 'en' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-200'} rounded-b-lg`}
          >
            <span>🇺🇸</span>
            <span>English</span>
            {language === 'en' && <span className="ml-auto">✓</span>}
          </button>
        </div>
      </div>
    );
  }

  // Toggle variant (default)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className={`text-sm font-medium ${language === 'en' ? 'text-blue-600' : 'text-gray-500'}`}>
          EN
        </span>
      )}
      <button
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        className={`relative w-14 h-7 rounded-full transition-colors ${
          language === 'ar' 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : 'bg-gradient-to-r from-blue-500 to-blue-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform flex items-center justify-center text-xs ${
            language === 'ar' ? 'right-0.5' : 'left-0.5'
          }`}
        >
          {language === 'ar' ? '🇸🇦' : '🇺🇸'}
        </span>
      </button>
      {showLabel && (
        <span className={`text-sm font-medium ${language === 'ar' ? 'text-green-600' : 'text-gray-500'}`}>
          عربي
        </span>
      )}
    </div>
  );
};

export default LanguageContext;
