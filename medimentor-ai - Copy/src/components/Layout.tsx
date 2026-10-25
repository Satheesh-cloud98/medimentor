import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MedicalDisclaimer } from './MedicalDisclaimer';
import { DemoBadge } from './DemoBadge';
import { Heart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Layout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Area */}
      <div className="lg:pl-72 flex flex-col flex-1 min-w-0">
        {/* Header */}
        <Header onOpenMobileMenu={() => setMobileSidebarOpen(true)} />

        {/* Demo Mode Top Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <DemoBadge size="sm" showIcon={false} />
            <span className="truncate">{t('demoBannerText')}</span>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          <Outlet />

          {/* Standard Medical Safety Disclaimer */}
          <div className="pt-4">
            <MedicalDisclaimer />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/80 bg-white/80 py-4 px-6 text-xs text-slate-500 text-center">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-teal-800">MediMentor AI</span>
              <span>• {t('appTagline')}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span>Prototype for clinical verification and education</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for patient safety
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
