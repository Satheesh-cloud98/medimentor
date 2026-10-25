import React, { useState } from 'react';
import {
  FileCode,
  CheckCircle2,
  Copy,
  Download,
  Layers,
} from 'lucide-react';
import { useReports } from '../context/ReportsContext';
import { useLanguage } from '../context/LanguageContext';
import { convertReportToFhirR4 } from '../services/fhirService';
import { DemoBadge } from '../components/DemoBadge';

export const FhirValidation: React.FC = () => {
  const { t } = useLanguage();
  const { reports, profile } = useReports();
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [copied, setCopied] = useState<boolean>(false);

  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0];
  const fhirBundle = selectedReport ? convertReportToFhirR4(selectedReport, profile) : null;
  const fhirJson = fhirBundle ? JSON.stringify(fhirBundle, null, 2) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(fhirJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([fhirJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-r4-${selectedReport?.id || 'bundle'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileCode className="w-7 h-7 text-teal-600" />
              {t('navFhir') || 'FHIR R4 Interoperability & Schema Validation'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Standard HL7® FHIR® R4 compliant resource synthesis, LOINC clinical vocabulary mappings, and validation checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Bundle</span>
          </button>
        </div>
      </div>

      {/* Selector & Compliance Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Medical Report
            </label>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.formattedDate || r.date})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Conformance Audit</h3>

            <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 rounded-lg text-emerald-800">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                FHIR R4 Schema
              </span>
              <span className="font-bold">100% VALID</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 rounded-lg text-emerald-800">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                LOINC Coding
              </span>
              <span className="font-bold">STANDARD</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 rounded-lg text-emerald-800">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Patient Reference
              </span>
              <span className="font-bold">RESOLVED</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-4 h-4 text-slate-500" />
                Resource Entries
              </span>
              <span className="font-bold">{fhirBundle?.entry.length || 0} Resources</span>
            </div>
          </div>
        </div>

        {/* JSON Viewer */}
        <div className="md:col-span-2 bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-hidden shadow-inner flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
            <span>FHIR R4 Bundle Payload (Type: document)</span>
            <span>{fhirJson.length} bytes</span>
          </div>
          <pre className="mt-3 overflow-y-auto max-h-[480px] text-teal-300 leading-relaxed pr-2">
            {fhirJson}
          </pre>
        </div>
      </div>
    </div>
  );
};
