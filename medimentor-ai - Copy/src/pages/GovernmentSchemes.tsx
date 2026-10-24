import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  QrCode,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  HeartPulse,
  Award,
} from 'lucide-react';
import { MOCK_ABHA_PROFILE, MOCK_PMJAY_PROFILE } from '../data/mockJourneyData';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

export const GovernmentSchemes: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'abha' | 'pmjay'>('abha');

  const pmjayBalance = MOCK_PMJAY_PROFILE.remainingAmount;
  const pmjayUsed = MOCK_PMJAY_PROFILE.coverageAmount - pmjayBalance;
  const usedPercent = Math.round((pmjayUsed / MOCK_PMJAY_PROFILE.coverageAmount) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-teal-600" />
              {t('navGovernmentSchemes') || 'Government Health Schemes & Digital ID'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Official Ayushman Bharat Digital Mission (ABDM) identification and PM-JAY health insurance benefits.
          </p>
        </div>
      </div>

      {/* Primary Selector Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('abha')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'abha'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>ABHA Digital Health Account</span>
        </button>
        <button
          onClick={() => setActiveTab('pmjay')}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'pmjay'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Ayushman Bharat (PM-JAY)</span>
        </button>
      </div>

      {activeTab === 'abha' && (
        <div className="space-y-6">
          {/* ABHA Card Banner */}
          <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-teal-500/30 text-teal-200 border border-teal-400/30 rounded text-xs font-semibold uppercase tracking-wider">
                    ABDM Certified
                  </span>
                  <span className="text-xs text-teal-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    e-KYC Verified
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Ayushman Bharat Health Account</h2>
                  <p className="text-xs sm:text-sm text-teal-100/80">
                    Unified 14-digit citizen health identification for consent-based record exchange across India.
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-teal-300 font-mono tracking-wider uppercase">ABHA Number</p>
                  <p className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-white mt-0.5">
                    {MOCK_ABHA_PROFILE.abhaNumber}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-teal-100 pt-1">
                  <div>
                    <span className="text-teal-300">Name:</span> {MOCK_ABHA_PROFILE.fullName}
                  </div>
                  <div>
                    <span className="text-teal-300">ABHA Address:</span> {MOCK_ABHA_PROFILE.abhaAddress}
                  </div>
                  <div>
                    <span className="text-teal-300">Auth Method:</span> {MOCK_ABHA_PROFILE.kycMethod}
                  </div>
                </div>
              </div>

              {/* QR Mockup */}
              <div className="bg-white p-4 rounded-xl shadow-lg shrink-0 flex flex-col items-center justify-center text-slate-800 w-44">
                <div className="w-28 h-28 bg-slate-100 border-2 border-slate-300 rounded-lg flex items-center justify-center p-2">
                  <QrCode className="w-24 h-24 text-slate-800" />
                </div>
                <p className="text-[10px] font-mono font-bold mt-2 text-slate-600">SCAN TO VERIFY</p>
                <p className="text-[9px] text-slate-400">National Health Authority</p>
              </div>
            </div>
          </div>

          {/* Linked Facilities */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  ABDM Empaneled Facilities Linked
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hospitals, clinics, and laboratories permitted to sync diagnostic reports with your ABHA ID.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-md">
                3 Facilities Linked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MOCK_ABHA_PROFILE.linkedFacilities.map((fac) => (
                <div key={fac.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <Building2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active Sync
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">{fac.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{fac.type}</p>
                  <p className="text-[11px] text-slate-400 mt-2">Linked: {fac.linkedDate}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-teal-900">Official National Health Authority (NHA) ABHA Gateway</p>
                <p className="text-teal-800 mt-0.5">
                  Manage Aadhaar KYC linkages, download your official PVC digital health card, and register new PHR addresses.
                </p>
              </div>
              <a
                href="https://abha.abdm.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 transition-colors shrink-0 shadow-2xs"
              >
                <span>Visit Official ABHA Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pmjay' && (
        <div className="space-y-6">
          {/* PM-JAY Coverage Overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-bold uppercase tracking-wider">
                    {MOCK_PMJAY_PROFILE.eligibilityStatus}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {MOCK_PMJAY_PROFILE.beneficiaryId}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{MOCK_PMJAY_PROFILE.schemeName}</h2>
                <p className="text-xs text-slate-500">
                  Provides secondary and tertiary care hospitalization coverage up to ₹5,00,000 per family per year.
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Annual Family Cap</p>
                <p className="text-2xl font-bold text-teal-700">₹5,00,000</p>
              </div>
            </div>

            {/* Coverage Meter */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Available Balance</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">₹{pmjayBalance.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500 mt-0.5">Valid through {MOCK_PMJAY_PROFILE.validThrough}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Claims Utilized</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">₹{pmjayUsed.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500 mt-0.5">1 minor hospitalization claimed</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Empaneled Hospitals</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {MOCK_PMJAY_PROFILE.empaneledHospitals.toLocaleString('en-IN')}+
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Cashless treatment nationwide</p>
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span>Coverage Utilization ({usedPercent}%)</span>
                <span>₹{pmjayUsed.toLocaleString('en-IN')} of ₹5,00,000 utilized</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, usedPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Key Scheme Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-600" />
                Key Covered Procedures
              </h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cardiology & Angioplasty treatments</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Oncology chemotherapy & surgical interventions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Orthopedic joint replacements & trauma surgeries</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pre & post hospitalization expenses (up to 15 days)</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                Cashless Claim Instructions
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Present your <strong>ABHA Card</strong> or <strong>PM-JAY Golden Card</strong> at the Ayushman Mitra desk
                at any empaneled government or private hospital for zero-out-of-pocket admission and treatment.
              </p>
              <div className="pt-2">
                <a
                  href="https://pmjay.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 font-semibold"
                >
                  <span>Official PM-JAY Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
