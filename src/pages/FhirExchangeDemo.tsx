import React, { useState } from 'react';
import {
  Network,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

interface ExchangeStage {
  step: number;
  title: string;
  description: string;
  actor: string;
  detail: string;
}

const STAGES: ExchangeStage[] = [
  {
    step: 1,
    title: 'Submit Clinical Request',
    description: 'Sunshine Multi-Specialty Hospital initiates laboratory record request to Apex Clinical Diagnostics.',
    actor: 'Hospital EHR System',
    detail: 'Requesting verified lipid profile & complete blood count for follow-up cardiology evaluation.',
  },
  {
    step: 2,
    title: 'Consent & Authorization Verification',
    description: 'ABDM Network Gateway validates patient consent token SEC-8924-APEX & digital signature.',
    actor: 'ABDM Consent Manager',
    detail: 'Dual authorization validated: Token active with 24-hour validity limit and doctor credentials verified.',
  },
  {
    step: 3,
    title: 'Biomarker Extraction & Filter',
    description: 'Apex Diagnostic Lab queries repository and filters permitted synthetic clinical documents.',
    actor: 'Laboratory Repository',
    detail: 'Complete Blood Count (CBC) and Lipid Profile selected. Redundant notes stripped to preserve privacy.',
  },
  {
    step: 4,
    title: 'FHIR R4 Bundle Synthesis',
    description: 'Diagnostic report and biometric observations mapped to standard LOINC clinical codes.',
    actor: 'FHIR Transformer Engine',
    detail: 'Generated FHIR R4 Bundle containing DiagnosticReport, Observation, and Organization resources.',
  },
  {
    step: 5,
    title: 'Encrypted Payload Transmission',
    description: 'Secure TLS 1.3 transfer between clinical endpoints with mutual certificate verification.',
    actor: 'Hospital Ingestion Node',
    detail: 'Payload delivered and validated. Biomarker trends merged into attending physician dashboard.',
  },
  {
    step: 6,
    title: 'Immutable Security Audit Logging',
    description: 'Transaction recorded in compliance with healthcare data protection and provenance standards.',
    actor: 'Security Audit Service',
    detail: 'Logged entry: Actor, timestamp, consent token, and resource hash recorded for patient transparency.',
  },
];

export const FhirExchangeDemo: React.FC = () => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setIsCompleted(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Network className="w-7 h-7 text-teal-600" />
              {t('navFhirExchange') || 'Cross-Facility FHIR R4 Exchange Simulator'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Simulate secure, consent-driven health data exchange between hospitals, clinics, and laboratories.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Simulation</span>
        </button>
      </div>

      {/* Visual Stepper */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {STAGES.map((s) => {
            const isDone = s.step < currentStep || isCompleted;
            const isCurrent = s.step === currentStep && !isCompleted;

            return (
              <div
                key={s.step}
                className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center ${
                  isDone
                    ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900'
                    : isCurrent
                    ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-400/30'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-teal-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                </div>
                <p className="text-[11px] font-bold leading-tight">{s.title}</p>
              </div>
            );
          })}
        </div>

        {/* Current Active Step Details */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded text-xs font-bold uppercase tracking-wider">
                Stage {currentStep} of 6
              </span>
              <span className="text-xs text-slate-500 font-medium">Actor: {STAGES[currentStep - 1].actor}</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900">{STAGES[currentStep - 1].title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{STAGES[currentStep - 1].description}</p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
              <strong>Payload Status:</strong> {STAGES[currentStep - 1].detail}
            </div>
          </div>

          <div className="flex flex-col justify-center items-start md:items-end gap-3 border-t md:border-t-0 pt-4 md:pt-0">
            {!isCompleted ? (
              <button
                onClick={handleNext}
                className="w-full md:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>{currentStep === 6 ? 'Complete Exchange' : 'Proceed to Next Step'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-left w-full">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Exchange Succeeded</span>
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  Synthetic records transferred with 100% FHIR R4 schema compliance and verified audit trail.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
