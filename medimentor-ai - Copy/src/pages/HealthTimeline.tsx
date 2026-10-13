import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Calendar,
  Building,
  GitCompare,
  MessageSquare,
  Download,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useReports, deduplicateReports } from '../context/ReportsContext';
import { DemoBadge } from '../components/DemoBadge';
import { convertReportToFhirR4, downloadFhirBundle } from '../services/fhirService';

export const HealthTimeline: React.FC = () => {
  const { t } = useLanguage();
  const { reports, setActiveReportId, profile, deleteReport } = useReports();
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [reportAId, setReportAId] = useState<string>(reports[0]?.id || '');
  const [reportBId, setReportBId] = useState<string>(reports[1]?.id || reports[0]?.id || '');
  const [showComparison, setShowComparison] = useState<boolean>(false);

  const reportA = reports.find((r) => r.id === reportAId) || reports[0];
  const reportB = reports.find((r) => r.id === reportBId) || reports[1] || reports[0];

  // Match common parameters between Report A and Report B
  const commonMetrics = useMemo(() => {
    if (!reportA || !reportB || reportA.id === reportB.id) return [];
    const matched: Array<{
      name: string;
      unit: string;
      valA: string;
      statusA: string;
      valB: string;
      statusB: string;
      refRange: string;
    }> = [];

    for (const mA of reportA.metrics) {
      const match = reportB.metrics.find(
        (mB) => mB.name.toLowerCase().trim() === mA.name.toLowerCase().trim()
      );
      if (match) {
        matched.push({
          name: mA.name,
          unit: mA.unit,
          valA: String(mA.value),
          statusA: mA.status,
          valB: String(match.value),
          statusB: match.status,
          refRange: mA.referenceRange,
        });
      }
    }
    return matched;
  }, [reportA, reportB]);

  // Auto-generate doctor discussion questions based on comparison
  const generatedDoctorQuestions = useMemo(() => {
    const questions: string[] = [];
    if (commonMetrics.length > 0) {
      commonMetrics.forEach((cm) => {
        if (cm.statusB === 'high' || cm.statusB === 'low') {
          questions.push(
            `My ${cm.name} was ${cm.valA} ${cm.unit} on ${reportA?.formattedDate} and is now ${cm.valB} ${cm.unit}. What therapeutic steps or lifestyle changes should we take?`
          );
        }
      });
    }
    if (questions.length === 0) {
      questions.push(
        `Are there specific dietary or exercise adjustments you recommend based on my latest results?`,
        `When would you like me to schedule my next follow-up panel?`
      );
    }
    return questions.slice(0, 3);
  }, [commonMetrics, reportA?.formattedDate]);

  const deduplicatedReports = useMemo(() => deduplicateReports(reports), [reports]);

  const filteredReports = deduplicatedReports.filter((r) => {
    if (filterCategory === 'all') return true;
    return r.category === filterCategory;
  });

  // Longitudinal mock trend checkpoints for demonstration
  const longitudinalTrends = [
    {
      metric: 'Glycated Hemoglobin (HbA1c)',
      unit: '%',
      target: '< 5.7%',
      direction: 'improving',
      data: [
        { period: 'Nov 2025', value: '6.8%', status: 'high' },
        { period: 'Mar 2026', value: '6.4%', status: 'high' },
        { period: 'Aug 2026', value: '6.1%', status: 'attention' },
      ],
      commentary: '-0.7% decrease over 9 months via regular cardio and dietary changes.',
    },
    {
      metric: 'Total Serum Cholesterol',
      unit: 'mg/dL',
      target: '< 200 mg/dL',
      direction: 'improving',
      data: [
        { period: 'Nov 2025', value: '242', status: 'high' },
        { period: 'Mar 2026', value: '235', status: 'high' },
        { period: 'Sep 2026', value: '224', status: 'high' },
      ],
      commentary: '-18 mg/dL reduction; continued aerobic exercise recommended.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                Diagnostic Journey
              </span>
              <DemoBadge size="sm" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('timelineTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t('timelineSubtitle')}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 mr-1" />
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('filterAll')}
            </button>
            <button
              onClick={() => setFilterCategory('blood')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === 'blood'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('filterBlood')}
            </button>
            <button
              onClick={() => setFilterCategory('metabolic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === 'metabolic'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('filterMetabolic')}
            </button>
            <button
              onClick={() => setFilterCategory('lipid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === 'lipid'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('filterCardio')}
            </button>
          </div>
        </div>
      </div>

      {/* Longitudinal Trends Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <span>{t('historicalTrendTitle')}</span>
            </h3>
            <p className="text-xs text-slate-500">{t('historicalTrendSubtitle')}</p>
          </div>
          <DemoBadge size="sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {longitudinalTrends.map((trend, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{trend.metric}</h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Clinical Target: {trend.target}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                  <TrendingDown className="w-3 h-3 text-emerald-700" /> Improving
                </span>
              </div>

              {/* Progress visual points */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {trend.data.map((pt, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-center shadow-2xs"
                  >
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      {pt.period}
                    </span>
                    <span
                      className={`text-base font-extrabold mt-0.5 block ${
                        pt.status === 'normal'
                          ? 'text-emerald-700'
                          : pt.status === 'attention'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {pt.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-teal-900 font-medium italic">
                {trend.commentary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Report Comparison & Doctor Visit Preparation */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5 text-teal-600" />
                Comparative Clinical Analytics
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Compare Two Reports &amp; Doctor Question Prep</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select two diagnostic reports to track longitudinal changes across common biomarkers and prepare questions for your physician.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer self-start sm:self-auto"
          >
            {showComparison ? 'Hide Comparison Table' : 'Open Report Comparison →'}
          </button>
        </div>

        {showComparison && (
          <div className="pt-3 border-t border-slate-100 space-y-4 animate-fadeIn">
            {/* Report Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Baseline / Earlier Report (A):
                </label>
                <select
                  value={reportAId}
                  onChange={(e) => setReportAId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:outline-teal-600 text-slate-900"
                >
                  {reports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.formattedDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Follow-up / Recent Report (B):
                </label>
                <select
                  value={reportBId}
                  onChange={(e) => setReportBId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:outline-teal-600 text-slate-900"
                >
                  {reports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.formattedDate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Table */}
            {commonMetrics.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                No overlapping quantitative laboratory biomarkers found between the selected reports. Select two blood or lab reports to view side-by-side metric comparison.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Biomarker</th>
                      <th className="py-2.5 px-4">Report A ({reportA?.formattedDate})</th>
                      <th className="py-2.5 px-4">Report B ({reportB?.formattedDate})</th>
                      <th className="py-2.5 px-4">Normal Range</th>
                      <th className="py-2.5 px-4">Trend Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commonMetrics.map((cm, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{cm.name}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {cm.valA} <span className="text-[10px] text-slate-400">{cm.unit}</span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {cm.valB} <span className="text-[10px] text-slate-400">{cm.unit}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{cm.refRange}</td>
                        <td className="py-2.5 px-4">
                          {cm.valA === cm.valB ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              Unchanged
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                cm.statusB === 'normal'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {cm.statusB === 'normal' ? 'Normal Baseline' : 'Requires Attention'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Questions to Ask Doctor */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
              <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
                Prepared Questions for Your Next Doctor's Appointment:
              </h4>
              <ul className="space-y-1.5 text-xs text-teal-950 pl-2">
                {generatedDoctorQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-teal-700 font-bold shrink-0">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-500 pt-1 italic">
                * Note: Bring this list of questions and your verified records to your appointment for discussion with your doctor.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chronological Timeline List */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-200">
        {filteredReports.map((report) => (
          <div key={report.id} className="relative group">
            {/* Timeline node icon */}
            <div className="absolute -left-6 sm:-left-8 top-5 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center ring-4 ring-white shadow-xs">
              <Calendar className="w-3 h-3" />
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {report.title}
                    </h4>
                    {report.isDemo ? (
                      <DemoBadge size="sm" />
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Patient Upload
                      </span>
                    )}
                    {report.isVerified ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('verifiedBadge')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {t('pendingBadge')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-teal-800 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-teal-600" />
                      {report.formattedDate}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      {report.labName}
                    </span>
                    <span>•</span>
                    <span>{report.fileName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const bundle = convertReportToFhirR4(report, profile);
                      downloadFhirBundle(bundle, `fhir-abdm-${report.id}.json`);
                    }}
                    title="Export FHIR R4 / ABDM JSON Document Bundle"
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <Link
                    to="/verify"
                    onClick={() => setActiveReportId(report.id)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-colors"
                  >
                    {report.isVerified ? t('edit') : t('navVerify')}
                  </Link>
                  <Link
                    to="/summary"
                    onClick={() => setActiveReportId(report.id)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    {t('viewDetails')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this record from your Health Timeline?')) {
                        deleteReport(report.id);
                      }
                    }}
                    title="Delete Record"
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Summary quote */}
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 leading-relaxed">
                {report.summary}
              </p>

              {/* Parameters / Specialty preview chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Parameters:
                </span>
                {report.metrics && report.metrics.length > 0 ? (
                  report.metrics.map((m) => (
                    <span
                      key={m.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        m.status === 'normal'
                          ? 'bg-slate-50 text-slate-700 border-slate-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                      }`}
                    >
                      <span>{m.name}:</span>
                      <strong className="text-slate-900">{m.value}</strong>
                      <span className="text-[10px] text-slate-400">{m.unit}</span>
                    </span>
                  ))
                ) : report.prescriptionData ? (
                  <>
                    {report.prescriptionData.doctorName ? (
                      <span className="text-xs text-slate-700 font-semibold">
                        Dr. {report.prescriptionData.doctorName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Doctor not stated</span>
                    )}
                    {(report.prescriptionData.medications || []).map((med, idx) => (
                      <span
                        key={med.id || idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200"
                      >
                        <strong>{med.name}</strong>
                        <span>{med.dosage}</span>
                        <span className="text-[10px] text-teal-600">({med.frequency})</span>
                      </span>
                    ))}
                    {(!report.prescriptionData.medications || report.prescriptionData.medications.length === 0) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                        No Medications Prescribed
                      </span>
                    )}
                  </>
                ) : report.eyeData ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200">
                      OD: SPH {report.eyeData.od.sph || '0.00'} / CYL {report.eyeData.od.cyl || '0.00'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200">
                      OS: SPH {report.eyeData.os.sph || '0.00'} / CYL {report.eyeData.os.cyl || '0.00'}
                    </span>
                    {report.eyeData.pd && (
                      <span className="text-xs text-slate-500">PD: {report.eyeData.pd}</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Clinical record verified</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
