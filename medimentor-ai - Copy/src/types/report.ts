import type {
  DocumentType,
  EyePrescriptionData,
  EcgReportData,
  RadiologyReportData,
  PrescriptionData,
  DischargeSummaryData,
} from './document';

export type MetricStatus = 'normal' | 'low' | 'high' | 'attention';

export interface MedicalMetric {
  id: string;
  name: string;
  value: string | number;
  unit: string;
  referenceRange: string;
  status: MetricStatus;
  verified: boolean;
  notes?: string;
  category?: string;
}

export interface MedicalReport {
  id: string;
  title: string;
  category: 'blood' | 'lipid' | 'metabolic' | 'cardiac' | 'general' | 'eye' | 'urine' | 'radiology' | 'prescription';
  documentType?: DocumentType;
  date: string;
  formattedDate: string;
  labName: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  fileName?: string;
  fileSize?: string;
  previewUrl?: string;
  metrics: MedicalMetric[];
  eyeData?: EyePrescriptionData;
  ecgData?: EcgReportData;
  radiologyData?: RadiologyReportData;
  prescriptionData?: PrescriptionData;
  dischargeData?: DischargeSummaryData;
  overallStatus: 'normal' | 'attention_needed' | 'consult_doctor';
  isVerified: boolean;
  isDemo: boolean;
  confidence: number;
  summary: string;
  keyFindings: string[];
  nextSteps: string[];
  questionsForDoctor: string[];
  aiExplanation?: string;
  factsFromDocument?: string[];
  isRealOcr?: boolean;
  rawText?: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  emergencyContact: string;
  allergies: string;
  chronicConditions: string;
}
