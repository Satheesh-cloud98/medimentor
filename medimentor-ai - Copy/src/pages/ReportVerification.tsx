import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Edit2,
  Save,
  ArrowRight,
  Eye,
  Sparkles,
  Pill,
  Stethoscope,
  Plus,
  Trash2,
  FileText,
  Download,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useReports } from '../context/ReportsContext';
import { DemoBadge } from '../components/DemoBadge';
import { convertReportToFhirR4, downloadFhirBundle } from '../services/fhirService';

export const ReportVerification: React.FC = () => {
  const { t } = useLanguage();
  const {
    reports,
    activeReportId,
    setActiveReportId,
    verifyMetric,
    updateMetricValue,
    verifyAllReportMetrics,
    saveVerifiedReport,
    updateReport,
    profile,
  } = useReports();

  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [savedToast, setSavedToast] = useState(false);
  const [showOriginalDoc, setShowOriginalDoc] = useState(false);

  // Active report
  const activeReport =
    reports.find((r) => r.id === activeReportId) || reports[0] || null;

  if (!activeReport) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
        <p className="text-slate-500">No reports available for verification.</p>
        <Link
          to="/upload"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm"
        >
          {t('quickActionUploadTitle')}
        </Link>
      </div>
    );
  }

  const handleStartEdit = (metricId: string, currentValue: string | number) => {
    setEditingMetricId(metricId);
    setTempValue(String(currentValue));
  };

  const handleSaveEdit = (metricId: string) => {
    updateMetricValue(activeReport.id, metricId, tempValue);
    setEditingMetricId(null);
  };

  const isEyeReport =
    activeReport.documentType === 'eye_prescription' ||
    activeReport.category === 'eye' ||
    Boolean(activeReport.eyeData);

  const isPrescriptionReport =
    activeReport.documentType === 'prescription' ||
    activeReport.category === 'prescription' ||
    Boolean(activeReport.prescriptionData);

  const handleUpdateMedication = (index: number, field: string, val: string) => {
    if (!activeReport.prescriptionData) return;
    const currentMeds = [...activeReport.prescriptionData.medications];
    currentMeds[index] = { ...currentMeds[index], [field]: val };
    updateReport(activeReport.id, {
      prescriptionData: {
        ...activeReport.prescriptionData,
        medications: currentMeds,
      },
    });
  };

  const handleToggleMedicationVerify = (index: number) => {
    if (!activeReport.prescriptionData) return;
    const currentMeds = [...activeReport.prescriptionData.medications];
    currentMeds[index] = {
      ...currentMeds[index],
      verified: !currentMeds[index].verified,
    };
    updateReport(activeReport.id, {
      prescriptionData: {
        ...activeReport.prescriptionData,
        medications: currentMeds,
      },
    });
  };

  const handleAddMedication = () => {
    if (!activeReport.prescriptionData) return;
    const newMed = {
      id: `med-${Date.now()}`,
      name: 'New Medication',
      dosage: 'e.g. 500mg',
      frequency: 'Once daily',
      instructions: 'After food',
      verified: true,
    };
    updateReport(activeReport.id, {
      prescriptionData: {
        ...activeReport.prescriptionData,
        medications: [...activeReport.prescriptionData.medications, newMed],
      },
    });
  };

  const handleRemoveMedication = (index: number) => {
    if (!activeReport.prescriptionData) return;
    const currentMeds = activeReport.prescriptionData.medications.filter((_, i) => i !== index);
    updateReport(activeReport.id, {
      prescriptionData: {
        ...activeReport.prescriptionData,
        medications: currentMeds,
      },
    });
  };

  const handleVerifyAllPrescription = () => {
    if (!activeReport.prescriptionData) return;
    const verifiedMeds = activeReport.prescriptionData.medications.map((m) => ({
      ...m,
      verified: true,
    }));
    updateReport(activeReport.id, {
      isVerified: true,
      prescriptionData: {
        ...activeReport.prescriptionData,
        medications: verifiedMeds,
      },
    });
  };

  const handleSaveAll = () => {
    saveVerifiedReport(activeReport.id);
    if (activeReport.prescriptionData) {
      handleVerifyAllPrescription();
    }
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
    }, 4000);
  };

  const handleExportFhir = () => {
    const bundle = convertReportToFhirR4(activeReport, profile);
    downloadFhirBundle(bundle, `fhir-abdm-${activeReport.id}.json`);
  };

  const allMetricsVerified =
    activeReport.metrics && activeReport.metrics.length > 0
      ? activeReport.metrics.every((m) => m.verified)
      : isPrescriptionReport && activeReport.prescriptionData?.medications?.length
      ? activeReport.prescriptionData.medications.every((m) => m.verified)
      : activeReport.isVerified;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Human-in-the-Loop Protocol
              </span>
              {activeReport.isDemo ? <DemoBadge size="sm" /> : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  REAL OCR RECORD
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('verifyTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t('verifySubtitle')}
            </p>
          </div>

          {/* Report Selector Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-slate-600">Select Report:</label>
            <select
              value={activeReport.id}
              onChange={(e) => setActiveReportId(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50 focus:outline-teal-600 text-slate-900"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.isVerified ? '✓ Verified' : '⚠ Pending'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Report Meta Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="font-semibold text-slate-900">{activeReport.labName}</span>
            <span>•</span>
            <span>
              Date: <strong className="text-slate-800">{activeReport.formattedDate}</strong>
            </span>
            <span>•</span>
            <span>
              Patient: <strong className="text-slate-800">{activeReport.patientName}</strong> (
              {activeReport.patientAge}y/{activeReport.patientGender})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200">
              Extraction Confidence: {activeReport.confidence}%
            </span>
            {activeReport.isVerified ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {t('verifiedBadge')}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                {t('pendingBadge')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Verification Notice */}
      <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 text-xs text-teal-950 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">{t('verifyHumanReviewAlert')}</p>
          <p className="text-teal-800/90 leading-relaxed">
            Examine every extracted parameter below. Click "Edit" if an optical recognition error occurred. Once all values match your original diagnostic slip, approve and save to create an immutable health timeline record.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {savedToast && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-900 text-sm font-bold flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{t('verificationSavedSuccess')}</span>
          </div>
          <Link
            to="/summary"
            className="text-xs font-extrabold text-emerald-800 underline hover:text-emerald-950"
          >
            Go to Health Summary →
          </Link>
        </div>
      )}

      {/* SPECIALTY VIEW 1: EYE PRESCRIPTION REVIEW */}
      {isEyeReport && activeReport.eyeData && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-teal-100 text-teal-700 rounded-2xl">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Spectacle Refraction Parameters
                </h3>
                <p className="text-xs text-slate-500">
                  Extracted OD (Right Eye) and OS (Left Eye) diopters and visual acuity
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-teal-800 px-3 py-1 bg-teal-50 rounded-full border border-teal-200">
              Specialty: Optometry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OD Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
                <span>Right Eye (OD - Oculus Dexter)</span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold">OD</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">Sphere (SPH):</span>
                  <strong className="text-slate-900 text-sm">{activeReport.eyeData.od.sph || '0.00'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Cylinder (CYL):</span>
                  <strong className="text-slate-900 text-sm">{activeReport.eyeData.od.cyl || '0.00'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Axis:</span>
                  <strong className="text-slate-900 text-sm">{activeReport.eyeData.od.axis || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Near Add (ADD):</span>
                  <strong className="text-slate-900 text-sm">{activeReport.eyeData.od.add || 'N/A'}</strong>
                </div>
                {activeReport.eyeData.od.va && (
                  <div>
                    <span className="text-slate-500 block">Visual Acuity:</span>
                    <strong className="text-slate-900 text-sm">{activeReport.eyeData.od.va}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* OS Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
                <span>Left Eye (OS - Oculus Sinister)</span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold">OS</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">Sphere (SPH):</span>
                  <strong className="text-slate-900 text-sm">{activeReport.eyeData.os.sph || '0.00'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Cylinder (CYL):</span>
                  <strong className="text-slate-900 text-sm">{activeReport.eyeData.os.cyl || '0.00'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Axis:</span>
                  <strong className="text-slate-900 text-sm">{activeReport.eyeData.os.axis || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Near Add (ADD):</span>
                  <strong className="text-slate-900 text-sm">{activeReport.eyeData.os.add || 'N/A'}</strong>
                </div>
                {activeReport.eyeData.os.va && (
                  <div>
                    <span className="text-slate-500 block">Visual Acuity:</span>
                    <strong className="text-slate-900 text-sm">{activeReport.eyeData.os.va}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeReport.eyeData.pd && (
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between text-xs max-w-sm">
              <span className="font-bold text-teal-900">Pupillary Distance (PD):</span>
              <strong className="text-teal-950 font-extrabold">{activeReport.eyeData.pd}</strong>
            </div>
          )}
        </div>
      )}

      {/* SPECIALTY VIEW 2: LAB / BLOOD PARAMETERS VERIFICATION TABLE */}
      {activeReport.metrics && activeReport.metrics.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Extracted Clinical Lab Parameters</span>
              </h3>
              <p className="text-xs text-slate-500">
                {activeReport.metrics.filter((m) => m.verified).length} of {activeReport.metrics.length} parameters verified
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => verifyAllReportMetrics(activeReport.id)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
              >
                {t('approveAllBtn')}
              </button>
            </div>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 sm:px-6">{t('thParameter')}</th>
                  <th className="py-3 px-4">{t('thExtractedValue')}</th>
                  <th className="py-3 px-4">{t('thNormalRange')}</th>
                  <th className="py-3 px-4">{t('thUnit')}</th>
                  <th className="py-3 px-4">{t('thStatus')}</th>
                  <th className="py-3 px-4 text-right pr-6">{t('thVerification')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeReport.metrics.map((metric) => {
                  const isEditing = editingMetricId === metric.id;

                  return (
                    <tr
                      key={metric.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        metric.verified ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Parameter Name */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <span className="font-bold text-slate-900 block">{metric.name}</span>
                        {metric.notes && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">{metric.notes}</span>
                        )}
                      </td>

                      {/* Extracted Value (Editable) */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              className="w-20 px-2 py-1 rounded-lg border border-teal-500 font-bold text-slate-900 text-sm focus:outline-teal-600"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(metric.id)}
                              className="p-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
                              title="Save value"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                              {metric.value}
                            </span>
                            <button
                              onClick={() => handleStartEdit(metric.id, metric.value)}
                              className="text-slate-400 hover:text-teal-700 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                              title="Edit value"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Normal Range */}
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {metric.referenceRange}
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-4 text-slate-500 font-semibold">{metric.unit}</td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {metric.status === 'normal' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {t('normalStatus')}
                          </span>
                        )}
                        {metric.status === 'high' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {t('highStatus')}
                          </span>
                        )}
                        {metric.status === 'low' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {t('lowStatus')}
                          </span>
                        )}
                        {metric.status === 'attention' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {t('attentionStatus')}
                          </span>
                        )}
                      </td>

                      {/* Verification Toggle */}
                      <td className="py-3.5 px-4 text-right pr-6">
                        <button
                          onClick={() =>
                            verifyMetric(activeReport.id, metric.id, !metric.verified)
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                            metric.verified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{metric.verified ? t('paramVerified') : t('paramNeedsReview')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SPECIALTY VIEW 3: CLINICAL MEDICATION PRESCRIPTION VERIFICATION */}
      {isPrescriptionReport && activeReport.prescriptionData && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-100 text-teal-700 rounded-2xl">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Prescription &amp; Medication Regimen</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Verify prescribing doctor, diagnosis notes, medications, dosages, and administration advice
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-800 px-3 py-1 bg-teal-50 rounded-full border border-teal-200">
                Specialty: Pharmacotherapy
              </span>
              <button
                type="button"
                onClick={handleVerifyAllPrescription}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
              >
                Approve All Prescription Fields
              </button>
            </div>
          </div>

          {/* Clinical Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  Prescribing Physician:
                </span>
                <span className="text-[11px] text-slate-400">Doctor</span>
              </div>
              <p className="font-extrabold text-slate-900 text-sm">
                {activeReport.prescriptionData.doctorName || 'Not specified in document'}
              </p>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block mb-0.5">Clinic / Hospital:</span>
                <p className="font-bold text-slate-800">
                  {activeReport.prescriptionData.clinicOrHospital || 'Not specified in document'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                Complaint / Diagnosis Notes:
              </span>
              <p className="font-semibold text-slate-900 text-xs leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                {activeReport.prescriptionData.complaintOrDiagnosis || 'Not specified in document'}
              </p>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block mb-0.5">Clinical Advice &amp; Instructions:</span>
                <p className="font-medium text-slate-800 text-xs bg-white p-2 rounded-xl border border-slate-200">
                  {activeReport.prescriptionData.adviceOrInstructions || 'Not specified in document'}
                </p>
              </div>
            </div>
          </div>

          {/* Medications Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                <span>Prescribed Medications ({activeReport.prescriptionData.medications.length})</span>
              </h4>
              <button
                type="button"
                onClick={handleAddMedication}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medication</span>
              </button>
            </div>

            {activeReport.prescriptionData.medications.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">No individual medications specified in document.</p>
                <p className="text-[11px] text-slate-400">
                  Note: {activeReport.prescriptionData.medicationsNotes || 'None recorded'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3.5">Medicine Name</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Instructions</th>
                      <th className="py-2.5 px-3 text-center">Verification</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeReport.prescriptionData.medications.map((med, mIdx) => (
                      <tr
                        key={med.id || mIdx}
                        className={`hover:bg-slate-50/70 ${med.verified ? 'bg-emerald-50/20' : ''}`}
                      >
                        <td className="py-2 px-3.5">
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => handleUpdateMedication(mIdx, 'name', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 font-bold text-slate-900 bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => handleUpdateMedication(mIdx, 'dosage', e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-slate-200 text-slate-800 bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => handleUpdateMedication(mIdx, 'frequency', e.target.value)}
                            className="w-28 px-2 py-1 rounded border border-slate-200 text-slate-800 bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={med.instructions || ''}
                            onChange={(e) => handleUpdateMedication(mIdx, 'instructions', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 text-slate-800 bg-white"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleMedicationVerify(mIdx)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                              med.verified
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-800'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{med.verified ? 'Verified' : 'Pending'}</span>
                          </button>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(mIdx)}
                            className="text-rose-600 hover:text-rose-800 font-bold text-xs p-1 cursor-pointer"
                            title="Remove Medication"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORIGINAL DOCUMENT REFERENCE (FOR VERIFICATION) */}
      {(activeReport.rawText || activeReport.previewUrl) && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Original Document Reference (Paper Copy Cross-Check)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowOriginalDoc(!showOriginalDoc)}
              className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
            >
              {showOriginalDoc ? 'Hide Document Reference' : 'Show Document Reference'}
            </button>
          </div>

          {showOriginalDoc && (
            <div className="pt-2 border-t border-slate-100">
              {activeReport.previewUrl && activeReport.fileName?.endsWith('.pdf') ? (
                <iframe
                  src={activeReport.previewUrl}
                  title="Original Document Preview"
                  className="w-full h-64 rounded-xl border border-slate-200"
                />
              ) : activeReport.previewUrl ? (
                <div className="flex justify-center p-2 rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={activeReport.previewUrl}
                    alt="Original Document"
                    className="max-h-64 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                  {activeReport.rawText}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 sm:p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          {allMetricsVerified ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> All extracted parameters approved by patient.
            </span>
          ) : (
            'Please review or approve extracted values before committing to records.'
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportFhir}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 hover:bg-teal-50 hover:border-teal-300 text-slate-700 hover:text-teal-800 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
            title="Export FHIR R4 / ABDM JSON Document Bundle"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Export FHIR R4 / ABDM</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{t('saveVerificationBtn')}</span>
          </button>

          <Link
            to="/summary"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors"
          >
            <span>{t('navSummary')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
