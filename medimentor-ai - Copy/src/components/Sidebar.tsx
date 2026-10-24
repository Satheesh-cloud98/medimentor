import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  CheckCircle2,
  FileText,
  Clock,
  Settings,
  X,
  Activity,
  HeartPulse,
  Bot,
  Pill,
  Calendar,
  ShieldCheck,
  Share2,
  GitCompare,
  FileCode,
  Network,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useReports } from '../context/ReportsContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { t } = useLanguage();
  const { reports, profile } = useReports();

  const unverifiedCount = reports.filter((r) => !r.isVerified).length;

  const clinicalItems = [
    {
      to: '/',
      label: t('navDashboard'),
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/upload',
      label: t('navUpload'),
      icon: Upload,
      badge: null,
    },
    {
      to: '/verify',
      label: t('navVerify'),
      icon: CheckCircle2,
      badge: unverifiedCount > 0 ? `${unverifiedCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      to: '/summary',
      label: t('navSummary'),
      icon: FileText,
      badge: null,
    },
    {
      to: '/timeline',
      label: t('navTimeline'),
      icon: Clock,
      badge: null,
    },
    {
      to: '/chat',
      label: t('navChat') || 'VerifiHealth AI',
      icon: Bot,
      badge: 'AI',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
    },
  ];

  const careItems = [
    {
      to: '/prescriptions',
      label: t('navPrescriptions') || 'Prescriptions',
      icon: Pill,
      badge: '4',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      to: '/appointments',
      label: t('navAppointments') || 'Appointments',
      icon: Calendar,
      badge: null,
    },
    {
      to: '/government-schemes',
      label: t('navGovernmentSchemes') || 'Govt Schemes (ABHA)',
      icon: ShieldCheck,
      badge: 'ABDM',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
    },
    {
      to: '/sharing',
      label: t('navSharing') || 'Consent Sharing',
      icon: Share2,
      badge: null,
    },
    {
      to: '/compare',
      label: t('navCompare') || 'Compare Reports',
      icon: GitCompare,
      badge: null,
    },
  ];

  const networkItems = [
    {
      to: '/fhir',
      label: t('navFhir') || 'FHIR R4 Schema',
      icon: FileCode,
      badge: null,
    },
    {
      to: '/network/exchange-demo',
      label: t('navFhirExchange') || 'Exchange Simulator',
      icon: Network,
      badge: 'DEMO',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    },
    {
      to: '/network/audit-log',
      label: t('navAuditLog') || 'Security Audit Trail',
      icon: ShieldAlert,
      badge: null,
    },
    {
      to: '/provider-portal',
      label: t('navProviderPortal') || 'Provider Network',
      icon: Building2,
      badge: null,
    },
  ];

  const renderNavGroup = (title: string, items: typeof clinicalItems) => (
    <div className="space-y-1">
      <p className="px-3.5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onCloseMobile}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2 rounded-xl font-medium text-xs transition-all ${
              isActive
                ? 'bg-teal-50 text-teal-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-2.5 truncate">
                <item.icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-600' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                >
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <NavLink to="/" onClick={onCloseMobile} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition-colors">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">
                  MediMentor
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-teal-100 text-teal-800 uppercase tracking-wider">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-none mt-0.5">
                Clinical Health Copilot & Network
              </p>
            </div>
          </NavLink>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {renderNavGroup('Clinical Health Portal', clinicalItems)}
          {renderNavGroup('Care & Consultations', careItems)}
          {renderNavGroup('Health Network & Exchange', networkItems)}

          <div className="pt-2">
            <NavLink
              to="/settings"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2 rounded-xl font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-slate-400" />
                <span>{t('navSettings')}</span>
              </div>
            </NavLink>
          </div>
        </nav>

        {/* Patient Profile Card (Demo Profile) */}
        <div className="p-3 m-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
              {profile.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {profile.name}
                </span>
                <span className="text-[8px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-semibold shrink-0">
                  DEMO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {profile.age} yrs • {profile.bloodGroup}
              </p>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1 text-teal-700 font-medium">
              <Activity className="w-3 h-3" /> ABDM Linked
            </span>
            <NavLink
              to="/settings"
              onClick={onCloseMobile}
              className="hover:text-teal-700 font-medium transition-colors"
            >
              {t('edit')}
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
};
