import type { MedicalMetric } from './report';
import type { SupportedLanguage } from './language';

export type DocumentType =
  | 'eye_prescription'
  | 'lab_report'
  | 'urine_test'
  | 'ecg_report'
  | 'radiology_report'
  | 'prescription'
  | 'discharge_summary'
  | 'unsupported';

export interface EyeParameter {
  sph?: string; // Sphere
  cyl?: string; // Cylinder
  axis?: string; // Axis
  add?: string; // Near Add
  va?: string; // Visual Acuity
}

export interface EyePrescriptionData {
  od: EyeParameter; // Right eye (Oculus Dexter)
  os: EyeParameter; // Left eye (Oculus Sinister)
  pd?: string; // Pupillary Distance
  prescribedBy?: string;
  prescriptionDate?: string;
  additionalNotes?: string;
}

export interface EcgReportData {
  ventricularRate?: string;
  heartRate?: string;
  prInterval?: string;
  qrsDuration?: string;
  qtInterval?: string;
  qtcInterval?: string;
  rhythm?: string;
  impression?: string;
}

export interface RadiologyReportData {
  modality?: string; // X-Ray, CT, MRI, Ultrasound
  bodyRegion?: string;
  clinicalIndication?: string;
  findings: string[];
  impression?: string;
}

export interface PrescriptionMedication {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  verified?: boolean;
}

export interface PrescriptionData {
  doctorName?: string;
  hospitalOrClinic?: string;
  clinicOrHospital?: string;
  patientName?: string;
  prescriptionDate?: string;
  complaintOrDiagnosis?: string;
  adviceOrInstructions?: string;
  medications: PrescriptionMedication[];
  medicationsNotes?: string;
  generalInstructions?: string;
}

export interface DischargeSummaryData {
  admissionDate?: string;
  dischargeDate?: string;
  primaryDiagnosis?: string;
  dischargeDiagnosis?: string;
  secondaryDiagnoses?: string[];
  proceduresPerformed?: string[];
  dischargeAdvice?: string[];
}

export interface DocumentClassificationResult {
  type: DocumentType;
  confidence: number;
  isAmbiguous: boolean;
  detectedKeywords: string[];
  alternativeTypes?: DocumentType[];
  reason: string;
}

export interface OcrExtractionResult {
  success: boolean;
  rawText: string;
  charCount: number;
  fileType: string;
  fileName: string;
  fileSize: string;
  previewUrl?: string;
  isScannedPdf?: boolean;
  error?: string;
  warning?: string;
}

export interface ExtractedDocumentData {
  classification: DocumentClassificationResult;
  eyeData?: EyePrescriptionData;
  labMetrics?: MedicalMetric[];
  ecgData?: EcgReportData;
  radiologyData?: RadiologyReportData;
  prescriptionData?: PrescriptionData;
  dischargeData?: DischargeSummaryData;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  documentDate?: string;
  facilityName?: string;
}

export interface AiExplanationResult {
  configured: boolean;
  factsFromDocument: string[];
  aiExplanation: string;
  clinicalConsiderations: string[];
  uncertainties: string[];
  languageUsed: SupportedLanguage;
  modelName?: string;
  isRateLimitFallback?: boolean;
  fallbackReason?: string;
  error?: string;
  setupInstructions?: string;
}
