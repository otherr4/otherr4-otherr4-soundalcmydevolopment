import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'si', name: 'සිංහල', flag: '🇱🇰' },
];

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleChange = (lng: string) => {
    i18n.changeLanguage(lng);
    setOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="relative ml-4 select-none">
      <button
        className="flex items-center px-3 py-1.5 rounded-md bg-dark-700 hover:bg-dark-600 transition-all shadow border border-dark-500 text-sm font-medium text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 min-w-[80px] justify-center"
        onClick={() => setOpen(v => !v)}
        aria-label={t('choose_language')}
      >
        <span className="text-lg mr-2">{current.flag}</span>
        <span className="hidden sm:inline text-xs">{current.code.toUpperCase()}</span>
        <svg 
          className={`ml-1 w-3 h-3 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-dark-800 border border-dark-600 rounded-md shadow-lg z-50 animate-fadeIn">
          {languages.map(lng => (
            <button
              key={lng.code}
              onClick={() => handleChange(lng.code)}
              className={`w-full flex items-center px-3 py-2 text-left text-gray-200 hover:bg-primary-500/10 transition-all text-sm ${
                i18n.language === lng.code ? 'font-bold text-primary-400 bg-primary-500/5' : ''
              }`}
            >
              <span className="text-lg mr-2">{lng.flag}</span>
              <span className="truncate">{lng.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector; 