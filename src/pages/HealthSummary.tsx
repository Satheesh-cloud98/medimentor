import React from 'react';
import {
  Heart,
  Droplet,
  Activity,
  FileCheck2,
  Printer,
  Download,
  HelpCircle,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useReports } from '../context/ReportsContext';
import { DemoBadge } from '../components/DemoBadge';

export const HealthSummary: React.FC = () => {
  const { t } = useLanguage();
  const { profile, reports } = useReports();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-teal-600" />
                Comprehensive Synthesis
              </span>
              <DemoBadge size="sm" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('summaryTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t('summarySubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{t('printSummaryBtn')}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t('downloadPdfBtn')}</span>
            </button>
          </div>
        </div>

        {/* Patient Demographic Strip */}
        <div className="mt-5 p-4 rounded-2xl bg-teal-50/50 border border-teal-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-slate-700">
            <span>
              Patient: <strong className="text-slate-900">{profile.name}</strong>
            </span>
            <span>
              Age/Sex: <strong className="text-slate-900">{profile.age} yrs / {profile.gender}</strong>
            </span>
            <span>
              Blood Group: <strong className="text-teal-800">{profile.bloodGroup}</strong>
            </span>
            <span>
              Records Analyzed: <strong className="text-slate-900">{reports.length} Reports</strong>
            </span>
          </div>

          <span className="font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300 text-[11px]">
            {t('overallHealthAssessment')}
          </span>
        </div>
      </div>

      {/* 4 Organ System Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Cardiovascular & Lipid Health */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {t('cardioSection')}
                </h3>
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  Mild Hypercholesterolemia
                </span>
              </div>
            </div>
            <DemoBadge size="sm" />
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">Total Cholesterol</span>
              <span className="font-extrabold text-rose-600">224 mg/dL (&lt; 200)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">LDL Cholesterol ("Bad")</span>
              <span className="font-extrabold text-rose-600">142 mg/dL (&lt; 100)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">HDL Cholesterol ("Good")</span>
              <span className="font-bold text-emerald-700">48 mg/dL (&gt; 40)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="font-medium">Triglycerides</span>
              <span className="font-extrabold text-rose-600">175 mg/dL (&lt; 150)</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
            Cardiovascular metrics show an elevated non-HDL lipid profile. Regular aerobic exercise (brisk walking 30 mins/day) and Mediterranean-style nutrition can help improve your lipid ratios.
          </p>
        </div>

        {/* Card 2: Blood Sugar & Metabolism */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {t('metabolismSection')}
                </h3>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Prediabetes Window (HbA1c: 6.1%)
                </span>
              </div>
            </div>
            <DemoBadge size="sm" />
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">HbA1c (Glycated Hb)</span>
              <span className="font-extrabold text-amber-600">6.1% (&lt; 5.7%)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">Fasting Blood Glucose</span>
              <span className="font-extrabold text-amber-600">112 mg/dL (70 - 99)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="font-medium">Estimated Average Glucose (eAG)</span>
              <span className="font-bold text-slate-800">128 mg/dL</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
            Both fasting sugar and HbA1c place current glycemic control in the prediabetes category. Early lifestyle changes (reducing refined carbs, post-meal strolls) frequently return parameters to normal.
          </p>
        </div>

        {/* Card 3: Hematology & Oxygen Delivery */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-600">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {t('hematologySection')}
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Normal Oxygen & Immune Reserve
                </span>
              </div>
            </div>
            <DemoBadge size="sm" />
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">Hemoglobin</span>
              <span className="font-extrabold text-emerald-700">14.6 g/dL (13.0 - 17.0)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">Total Leukocyte Count (WBC)</span>
              <span className="font-bold text-slate-800">6,800 /mcL (4k - 11k)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="font-medium">Platelet Count</span>
              <span className="font-bold text-slate-800">265,000 /mcL (150k - 450k)</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
            Blood counts demonstrate adequate red blood cell concentration and normal immune defense markers with no signs of active chronic infection or anemia.
          </p>
        </div>

        {/* Card 4: Kidney & Hepatic Function */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {t('renalLiverSection')}
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Healthy Filtration & Balance
                </span>
              </div>
            </div>
            <DemoBadge size="sm" />
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">Serum Creatinine</span>
              <span className="font-extrabold text-emerald-700">0.92 mg/dL (0.7 - 1.2)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium">eGFR Filtration Rate</span>
              <span className="font-bold text-slate-800">&gt; 90 mL/min/1.73m²</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="font-medium">Serum Sodium / Potassium</span>
              <span className="font-bold text-slate-800">140 / 4.2 mEq/L (Balanced)</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
            Renal filtration markers and electrolytes reflect healthy kidney health. Continue normal daily hydration of 2.5 to 3 liters of water.
          </p>
        </div>
      </div>

      {/* Key Clinical Observations & Discussion Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Observations */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>{t('keyFindingsTitle')}</span>
          </h3>

          <ul className="space-y-2.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
              <span>
                <strong>Elevated Non-HDL Lipid Profile:</strong> Total Cholesterol at 224 mg/dL and LDL at 142 mg/dL suggest an atherogenic lipid surplus.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span>
                <strong>Early Prediabetes Signature:</strong> HbA1c at 6.1% and Fasting Blood Sugar at 112 mg/dL indicate insulin sensitivity can be bolstered with lifestyle shifts.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
              <span>
                <strong>Strong Hematological & Renal Base:</strong> Optimal Hemoglobin (14.6 g/dL) and Serum Creatinine (0.92 mg/dL) demonstrate strong fundamental organ reserves.
              </span>
            </li>
          </ul>
        </div>

        {/* Doctor Questions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-teal-600" />
            <span>{t('questionsForDoctorTitle')}</span>
          </h3>

          <ul className="space-y-2.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
              <span>
                "Given my HbA1c of 6.1%, what specific dietary regimen or carb target do you recommend for reversing prediabetes?"
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
              <span>
                "Should we repeat my lipid panel in 90 days to test the impact of my aerobic exercise regimen?"
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
              <span>
                "Are any prescription therapies necessary, or is lifestyle modification sufficient for the next quarter?"
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
