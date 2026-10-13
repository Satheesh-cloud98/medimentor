import React, { useState, useRef, useEffect } from 'react';
import { Menu, Upload, Languages, ChevronDown, Check } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from './DemoBadge';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const { language, setLanguage, t, languages, currentLanguageInfo } = useLanguage();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    if (location.pathname === '/') return t('navDashboard');
    if (location.pathname.startsWith('/upload')) return t('navUpload');
    if (location.pathname.startsWith('/verify')) return t('navVerify');
    if (location.pathname.startsWith('/summary')) return t('navSummary');
    if (location.pathname.startsWith('/timeline')) return t('navTimeline');
    if (location.pathname.startsWith('/settings')) return t('navSettings');
    return t('appName');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Mobile hamburger & current page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right: Actions, Language selector & Demo badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Demo Badge */}
          <div className="hidden xs:block">
            <DemoBadge size="sm" />
          </div>

          {/* 13-Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 text-teal-900 border border-teal-200 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer"
              aria-label="Select language"
              aria-expanded={isLangMenuOpen}
            >
              <Languages className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="hidden sm:inline text-teal-700 font-normal">
                {currentLanguageInfo.name}
              </span>
              <span className="font-bold text-teal-900">{currentLanguageInfo.nativeName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-teal-600 shrink-0 opacity-80" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-h-96 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn divide-y divide-slate-100">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select Language (13 Languages)
                </div>
                <div className="py-1">
                  {languages.map((item) => {
                    const isSelected = item.code === language;
                    return (
                      <button
                        key={item.code}
                        onClick={() => {
                          setLanguage(item.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 text-teal-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500">{item.name}</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {item.nativeName}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          {location.pathname !== '/upload' && (
            <Link
              to="/upload"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-medium text-xs sm:text-sm shadow-xs hover:shadow-sm transition-all"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('navUpload')}</span>
              <span className="sm:hidden">{t('edit')}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
