import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Activity,
  Heart,
  Droplet,
  Pill,
  Bell,
  Check,
  Calendar,
  ShieldCheck,
  GitCompare,
  Share2,
  Building2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useReports } from '../context/ReportsContext';
import { DemoBadge } from '../components/DemoBadge';
import { MetricCard } from '../components/MetricCard';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { reports, profile, setActiveReportId } = useReports();

  const totalReports = reports.length;
  const verifiedReports = reports.filter((r) => r.isVerified).length;
  const unverifiedReports = reports.filter((r) => !r.isVerified).length;

  // Count flagged metrics across all reports
  const allMetrics = reports.flatMap((r) => r.metrics);
  const flaggedCount = allMetrics.filter((m) => m.status === 'high' || m.status === 'low').length;

  // Medication Adherence state
  const [takenMeds, setTakenMeds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`medimentor_taken_meds_${profile.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleMedTaken = (medId: string) => {
    setTakenMeds((prev) => {
      const updated = { ...prev, [medId]: !prev[medId] };
      try {
        localStorage.setItem(`medimentor_taken_meds_${profile.id}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Active verified prescription medications
  const verifiedPrescriptions = reports.filter(
    (r) => (r.documentType === 'prescription' || Boolean(r.prescriptionData)) && r.isVerified
  );
  const activeMedications = verifiedPrescriptions.flatMap((r) =>
    (r.prescriptionData?.medications || []).map((m, idx) => ({
      ...m,
      uniqueId: `${r.id}-${m.id || idx}`,
      doctor: r.prescriptionData?.doctorName || '',
      date: r.formattedDate,
    }))
  );

  // Dynamic spotlight vitals from latest reports or fallback
  const getLatestMetric = (keywords: string[], fallback: any) => {
    for (const r of reports) {
      for (const m of r.metrics) {
        if (keywords.some((k) => m.name.toLowerCase().includes(k.toLowerCase()))) {
          return m;
        }
      }
    }
    return fallback;
  };

  const glucoseMetric = getLatestMetric(['glucose', 'sugar'], {
    id: 'spot-1',
    name: 'Fasting Blood Glucose',
    value: '112',
    unit: 'mg/dL',
    referenceRange: '70 - 99',
    status: 'high' as const,
    verified: true,
    notes: 'Prediabetes fasting threshold. Monitor dietary carbs.',
  });

  const cholesterolMetric = getLatestMetric(['cholesterol', 'lipid'], {
    id: 'spot-2',
    name: 'Total Serum Cholesterol',
    value: '224',
    unit: 'mg/dL',
    referenceRange: '< 200',
    status: 'high' as const,
    verified: true,
    notes: 'Mild hypercholesterolemia. Aerobic activity advised.',
  });

  const hgbMetric = getLatestMetric(['hemoglobin', 'hgb', 'hb'], {
    id: 'spot-3',
    name: 'Hemoglobin (Oxygen Reserve)',
    value: '14.6',
    unit: 'g/dL',
    referenceRange: '13.0 - 17.0',
    status: 'normal' as const,
    verified: true,
    notes: 'Healthy baseline oxygen-carrying capacity.',
  });

  const creatMetric = getLatestMetric(['creatinine', 'renal', 'kidney'], {
    id: 'spot-4',
    name: 'Serum Creatinine (Renal Marker)',
    value: '0.92',
    unit: 'mg/dL',
    referenceRange: '0.70 - 1.20',
    status: 'normal' as const,
    verified: false,
    notes: 'Awaiting clinical verification.',
  });

  const spotlightMetrics = [glucoseMetric, cholesterolMetric, hgbMetric, creatMetric];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Welcome Banner */}
      <div className="bg-linear-to-r from-teal-700 via-teal-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-xl" />
        <div className="absolute bottom-0 right-1/4 -mb-12 w-48 h-48 rounded-full bg-teal-500/10 pointer-events-none blur-lg" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-white/15 backdrop-blur-xs rounded-full border border-white/20">
                Patient Portal
              </span>
              <DemoBadge size="sm" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('dashGreeting')}, {profile.name}
            </h2>
            <p className="text-teal-100 text-sm sm:text-base leading-relaxed">
              {t('dashSubtitle')}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-teal-900 font-bold text-sm shadow-md hover:bg-teal-50 transition-all hover:scale-102"
            >
              <Upload className="w-4 h-4 text-teal-700" />
              <span>{t('quickActionUploadTitle')}</span>
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600/80 hover:bg-teal-600 text-white font-bold text-sm border border-teal-500/50 backdrop-blur-xs transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('navVerify')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Reports */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {t('statTotalReports')}
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalReports}</span>
            <span className="text-xs text-slate-500 font-medium">records</span>
          </div>
          <p className="mt-1 text-[11px] text-teal-700 font-medium">
            Synchronized with lab portals
          </p>
        </div>

        {/* Stat 2: Verified Reports */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {t('statVerifiedReports')}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700">
              {verifiedReports}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ {totalReports}</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">
            {unverifiedReports > 0 ? `${unverifiedReports} pending review` : 'All verified'}
          </p>
        </div>

        {/* Stat 3: Flagged Metrics */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {t('statFlaggedMetrics')}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{flaggedCount}</span>
            <span className="text-xs text-slate-500 font-medium">elevated/low</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">
            Cholesterol & Fasting Glucose
          </p>
        </div>

        {/* Stat 4: Health Score */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {t('statHealthScore')}
            </span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-teal-700">88</span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-teal-700 font-medium">
            Stable baseline • Lifestyle focus
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <span>{t('quickActionsTitle')}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/upload"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                {t('quickActionUploadTitle')}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t('quickActionUploadDesc')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-teal-700 gap-1 group-hover:gap-2 transition-all">
              <span>{t('viewDetails')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/verify"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                {t('quickActionVerifyTitle')}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t('quickActionVerifyDesc')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-teal-700 gap-1 group-hover:gap-2 transition-all">
              <span>{t('viewDetails')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/summary"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Heart className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                {t('quickActionSummaryTitle')}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t('quickActionSummaryDesc')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-teal-700 gap-1 group-hover:gap-2 transition-all">
              <span>{t('viewDetails')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/timeline"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                {t('quickActionTimelineTitle')}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t('quickActionTimelineDesc')}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-teal-700 gap-1 group-hover:gap-2 transition-all">
              <span>{t('viewDetails')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>
      {/* Connected Care & Health Network Hub */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Care Consultations & Health Network</span>
            </h3>
            <p className="text-xs text-slate-500">
              National ABDM identity, longitudinal report comparisons, provider directory, and consent sharing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <Link
            to="/prescriptions"
            className="group bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Pill className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-700 transition-colors">
                  Prescription Regimens
                </h4>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">4 Active</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Track morning/noon/night doses, durations, and refill schedules.
              </p>
            </div>
          </Link>

          <Link
            to="/appointments"
            className="group bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-700 transition-colors">
                  Care Appointments
                </h4>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">Telehealth</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Book in-person clinic visits and join secure video consultations.
              </p>
            </div>
          </Link>

          <Link
            to="/government-schemes"
            className="group bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-700 transition-colors">
                  ABHA & PM-JAY Schemes
                </h4>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">₹5L Cover</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                14-digit ABDM ID card, linked facilities, and PM-JAY utilization.
              </p>
            </div>
          </Link>

          <Link
            to="/compare"
            className="group bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <GitCompare className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-700 transition-colors">
                  Report Comparison
                </h4>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">Deltas</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Side-by-side longitudinal biomarker shifts and percentage deltas.
              </p>
            </div>
          </Link>

          <Link
            to="/sharing"
            className="group bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-700 transition-colors">
                  Consent-Based Sharing
                </h4>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">Tokens</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Generate 24h/7d ephemeral tokens and review incoming access requests.
              </p>
            </div>
          </Link>

          <Link
            to="/provider-portal"
            className="group bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-teal-400 hover:shadow-xs transition-all flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-700 transition-colors">
                  Provider Registry & Verification
                </h4>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">NABH</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Empaneled clinical directory, credential verification queue, and onboarding.
              </p>
            </div>
          </Link>
        </div>
      </div>


      {/* Key Biomarkers Spotlight */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-teal-600" />
              <span>{t('keyVitalsTitle')}</span>
            </h3>
            <p className="text-xs text-slate-500">{t('keyVitalsSubtitle')}</p>
          </div>
          <Link
            to="/summary"
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            <span>{t('viewDetails')}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {spotlightMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </div>

      {/* Active Medication Regimens & Daily Adherence Reminders */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-teal-600" />
                Health Copilot Adherence Tracker
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              <span>Verified Medication Regimens &amp; Dose Schedule</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Derived automatically from verified prescriptions. Check off your doses today to track adherence.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeMedications.length > 0 && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Adherence: {activeMedications.filter((m) => takenMeds[m.uniqueId]).length} of {activeMedications.length} taken
              </span>
            )}
          </div>
        </div>

        {activeMedications.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-800">No active medication regimens recorded.</p>
              <p className="text-slate-500">
                Upload and verify a prescription in Upload Medical Records to automatically generate daily dosing schedules.
              </p>
            </div>
            <Link
              to="/upload"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Prescription</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {activeMedications.map((med) => {
              const isTaken = Boolean(takenMeds[med.uniqueId]);
              return (
                <div
                  key={med.uniqueId}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isTaken
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-slate-900 text-sm">{med.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                        {med.dosage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      Freq: {med.frequency}
                    </p>
                    {med.instructions && (
                      <p className="text-[11px] text-slate-500 mt-0.5 italic">
                        "{med.instructions}"
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2">
                      {med.doctor ? `Dr. ${med.doctor} • ` : ''}{med.date}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {isTaken ? 'Taken today' : 'Scheduled dose'}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleMedTaken(med.uniqueId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isTaken
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500 hover:text-teal-700'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-3" />
                      <span>{isTaken ? 'Done' : 'Mark Taken'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Medical Reports Table/Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>{t('recentReportsTitle')}</span>
            </h3>
            <p className="text-xs text-slate-500">{t('recentReportsSubtitle')}</p>
          </div>

          <Link
            to="/timeline"
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View Full Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{report.title}</h4>
                  {report.isDemo ? (
                    <DemoBadge size="sm" />
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Patient Upload
                    </span>
                  )}
                  {report.isVerified ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {t('verifiedBadge')}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {t('pendingBadge')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-700">{report.formattedDate}</span>
                  <span>•</span>
                  <span>{report.labName}</span>
                  <span>•</span>
                  <span>{report.metrics.length} parameters</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/verify"
                  onClick={() => setActiveReportId(report.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    report.isVerified
                      ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      : 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700 shadow-2xs'
                  }`}
                >
                  {report.isVerified ? t('edit') : t('navVerify')}
                </Link>
                <Link
                  to="/summary"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors"
                >
                  {t('viewDetails')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
