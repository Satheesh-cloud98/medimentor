import React, { useState } from 'react';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Download,
} from 'lucide-react';
import { useReports } from '../context/ReportsContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

export const ReportComparison: React.FC = () => {
  const { t } = useLanguage();
  const { reports } = useReports();

  const [reportAId, setReportAId] = useState<string>(reports[0]?.id || '');
  const [reportBId, setReportBId] = useState<string>(reports[1]?.id || reports[0]?.id || '');

  const reportA = reports.find((r) => r.id === reportAId) || reports[0];
  const reportB = reports.find((r) => r.id === reportBId) || reports[1] || reports[0];

  // Map metric names between Report A and Report B
  const allMetricNames = Array.from(
    new Set([
      ...(reportA?.metrics || []).map((m) => m.name),
      ...(reportB?.metrics || []).map((m) => m.name),
    ])
  );

  const exportComparisonJson = () => {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      reportA: {
        id: reportA?.id,
        title: reportA?.title,
        date: reportA?.formattedDate || reportA?.date,
        lab: reportA?.labName,
      },
      reportB: {
        id: reportB?.id,
        title: reportB?.title,
        date: reportB?.formattedDate || reportB?.date,
        lab: reportB?.labName,
      },
      biomarkerDeltas: allMetricNames.map((name) => {
        const metricA = reportA?.metrics.find((m) => m.name === name);
        const metricB = reportB?.metrics.find((m) => m.name === name);
        const valA = metricA ? parseFloat(String(metricA.value).replace(/[^0-9.]/g, '')) : null;
        const valB = metricB ? parseFloat(String(metricB.value).replace(/[^0-9.]/g, '')) : null;
        const delta = valA !== null && valB !== null && !isNaN(valA) && !isNaN(valB) ? +(valB - valA).toFixed(2) : null;
        return {
          metricName: name,
          unit: metricA?.unit || metricB?.unit,
          reportAValue: metricA?.value ?? null,
          reportAStatus: metricA?.status ?? null,
          reportBValue: metricB?.value ?? null,
          reportBStatus: metricB?.status ?? null,
          delta,
          normalRange: metricA?.referenceRange || metricB?.referenceRange,
        };
      }),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medimentor-biomarker-comparison-${Date.now()}.json`;
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
              <GitCompare className="w-7 h-7 text-teal-600" />
              {t('navCompare') || 'Diagnostic Report Comparison'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Evaluate longitudinal biomarker changes between diagnostic tests over time.
          </p>
        </div>

        <button
          onClick={exportComparisonJson}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Comparison (JSON)</span>
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Baseline Report (Test A)
          </label>
          <select
            value={reportAId}
            onChange={(e) => setReportAId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} — {r.formattedDate || r.date} ({r.labName})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Follow-Up Report (Test B)
          </label>
          <select
            value={reportBId}
            onChange={(e) => setReportBId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} — {r.formattedDate || r.date} ({r.labName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider">
              Report A (Baseline)
            </span>
            <span className="text-xs text-slate-500">{reportA?.formattedDate || reportA?.date}</span>
          </div>
          <h3 className="font-bold text-slate-900 text-base mt-2">{reportA?.title}</h3>
          <p className="text-xs text-slate-500">{reportA?.labName}</p>
          <p className="text-xs text-slate-600 mt-2 line-clamp-2">{reportA?.summary}</p>
        </div>

        <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 bg-teal-200 text-teal-800 rounded text-xs font-bold uppercase tracking-wider">
              Report B (Follow-Up)
            </span>
            <span className="text-xs text-teal-700">{reportB?.formattedDate || reportB?.date}</span>
          </div>
          <h3 className="font-bold text-slate-900 text-base mt-2">{reportB?.title}</h3>
          <p className="text-xs text-slate-500">{reportB?.labName}</p>
          <p className="text-xs text-slate-600 mt-2 line-clamp-2">{reportB?.summary}</p>
        </div>
      </div>

      {/* Metrics Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Biomarker Parameter Comparison</h2>
          <span className="text-xs text-slate-500">{allMetricNames.length} Parameters Evaluated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Biomarker Parameter</th>
                <th className="py-3 px-4">Report A Value</th>
                <th className="py-3 px-4">Report B Value</th>
                <th className="py-3 px-4">Delta / Shift</th>
                <th className="py-3 px-4">Reference Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allMetricNames.map((name) => {
                const metricA = reportA?.metrics.find((m) => m.name === name);
                const metricB = reportB?.metrics.find((m) => m.name === name);

                const valA = metricA ? parseFloat(String(metricA.value).replace(/[^0-9.]/g, '')) : null;
                const valB = metricB ? parseFloat(String(metricB.value).replace(/[^0-9.]/g, '')) : null;

                let delta: number | null = null;
                let deltaPercent: number | null = null;
                if (valA !== null && valB !== null && !isNaN(valA) && !isNaN(valB) && valA !== 0) {
                  delta = +(valB - valA).toFixed(2);
                  deltaPercent = +(((valB - valA) / valA) * 100).toFixed(1);
                }

                return (
                  <tr key={name} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{name}</td>

                    <td className="py-3 px-4">
                      {metricA ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">
                            {metricA.value} {metricA.unit}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              metricA.status === 'normal'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {metricA.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not tested in A</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {metricB ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">
                            {metricB.value} {metricB.unit}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              metricB.status === 'normal'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {metricB.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not tested in B</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {delta !== null && deltaPercent !== null ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          {delta > 0 ? (
                            <span className="text-rose-600 flex items-center gap-0.5">
                              <TrendingUp className="w-3.5 h-3.5" />+{delta} ({deltaPercent}%)
                            </span>
                          ) : delta < 0 ? (
                            <span className="text-emerald-600 flex items-center gap-0.5">
                              <TrendingDown className="w-3.5 h-3.5" />
                              {delta} ({deltaPercent}%)
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-0.5">
                              <Minus className="w-3.5 h-3.5" /> Stable
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-500">
                      {metricB?.referenceRange || metricA?.referenceRange || 'Standard clinical normal'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Interpretation Notes */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-teal-600" />
          Physician Consultation Discussion Points
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Significant shifts observed in biomarker levels between test dates should be evaluated in context of
          concurrent medication adjustments, dietary compliance, and fasting protocols. Bring this comparative report
          to your next clinical appointment.
        </p>
      </div>
    </div>
  );
};
