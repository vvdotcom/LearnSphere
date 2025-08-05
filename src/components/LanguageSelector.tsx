import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage, Language } from '../contexts/LanguageContext';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="flex items-center gap-2 text-stone-400 hover:text-[#ffffff] hover:bg-[#ffffff]/10 w-full justify-between border-white"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <span>{currentLanguage?.flag} {currentLanguage?.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg shadow-lg z-50 min-w-[200px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#ffffff]/10 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  language === lang.code 
                    ? 'text-[#ffffff] bg-[#ffffff]/20' 
                    : 'text-stone-300 hover:text-[#ffffff]'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;