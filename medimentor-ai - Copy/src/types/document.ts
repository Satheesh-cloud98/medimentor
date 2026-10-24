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

export const PRESCRIPTION_FALLBACKS = {
  patientName: 'Your name is not mentioned clearly in this prescription.',
  patientAge: 'Age is not mentioned in this prescription.',
  patientGender: 'Gender is not mentioned in this prescription.',
  patientUhid: 'Patient ID / UHID is not mentioned in this prescription.',
  prescriptionDate: 'Prescription date is not mentioned in this prescription.',
  doctorName: 'Doctor name is not mentioned in this prescription.',
  doctorQualification: 'Doctor qualification or registration number is not mentioned in this prescription.',
  hospitalOrClinic: 'Hospital or clinic name is not mentioned in this prescription.',
  hospitalAddressContact: 'Hospital address and contact details are not mentioned in this prescription.',
} as const;

export interface PrescriptionMedication {
  id?: string;
  name: string;
  dosage?: string;
  dosageForm?: string; // e.g. Tablet, Capsule, Syrup, Drops, Injection, Ointment, Inhaler
  form?: string; // alias
  frequency?: string; // e.g. 1-0-1, OD, BD, TDS, Once daily, SOS
  timing?: string; // e.g. Morning & Night, Morning, Bedtime
  foodRelation?: string; // e.g. After food, Before food, With meals
  duration?: string; // e.g. 5 days, 1 month, 2 weeks
  instructions?: string; // e.g. with warm water, avoid dairy
  verified?: boolean;
}

export interface PrescriptionData {
  doctorName?: string;
  doctorQualification?: string; // e.g. MBBS, MD, Registration number
  hospitalOrClinic?: string;
  clinicOrHospital?: string;
  hospitalAddressContact?: string; // Address and contact details
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  patientUhid?: string; // UHID / IPD / OPD / Patient ID
  prescriptionDate?: string;
  complaintOrDiagnosis?: string;
  adviceOrInstructions?: string;
  medications: PrescriptionMedication[];
  medicationsNotes?: string;
  generalInstructions?: string;
  doctorQuestions?: string[];
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
  doctorQuestions?: string[];
  languageUsed: SupportedLanguage;
  modelName?: string;
  isRateLimitFallback?: boolean;
  fallbackReason?: string;
  error?: string;
  setupInstructions?: string;
}
