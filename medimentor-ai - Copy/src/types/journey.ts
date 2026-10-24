export interface MedicationCourse {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  schedule: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  };
  timing: string;
  duration: string;
  daysCompleted: number;
  totalDays: number;
  prescribedBy: string;
  prescribedDate: string;
  status: 'active' | 'completed' | 'paused';
  instructions: string;
  refillDue?: string;
}

export interface AppointmentItem {
  id: string;
  doctorName: string;
  specialty: string;
  hospitalOrClinic: string;
  date: string;
  time: string;
  type: 'in-person' | 'video' | 'audio';
  status: 'confirmed' | 'requested' | 'completed' | 'cancelled';
  reason: string;
  locationOrLink?: string;
}

export interface AbhaProfile {
  abhaNumber: string;
  abhaAddress: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  mobile: string;
  status: 'Verified' | 'Pending KYC' | 'Unlinked';
  kycMethod: string;
  linkedFacilities: Array<{
    id: string;
    name: string;
    type: string;
    linkedDate: string;
  }>;
}

export interface PmjayProfile {
  beneficiaryId: string;
  schemeName: string;
  coverageAmount: number;
  remainingAmount: number;
  validThrough: string;
  familyMembersCovered: number;
  eligibilityStatus: 'Eligible & Active' | 'Under Verification' | 'Renewal Due';
  empaneledHospitals: number;
}

export interface ConsentShareItem {
  id: string;
  recipient: string;
  recipientRole: string;
  purpose: string;
  documents: string[];
  validity: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'revoked' | 'expired';
  accessCode: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'REVOKED' | 'EXPIRED';
  details: string;
  ip: string;
}

export interface ProviderItem {
  id: string;
  name: string;
  type: 'Hospital' | 'Clinic' | 'Diagnostic Lab' | 'Doctor';
  specialty?: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  verificationStatus: 'Verified' | 'Under Review' | 'Submitted' | 'Draft' | 'Rejected';
  licenseNumber: string;
  fhirEndpoint?: string;
  rating?: number;
}
