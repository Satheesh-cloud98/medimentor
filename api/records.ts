import fs from 'fs';
import path from 'path';
import { authenticateRequest } from './auth.js';

export interface ServerMedicalRecord {
  id: string;
  patientId: string;
  title: string;
  category: string;
  documentType?: string;
  date: string;
  formattedDate: string;
  isVerified: boolean;
  isDemo?: boolean;
  metrics?: any[];
  facts?: string[];
  prescriptionData?: any;
  summary?: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

// Initial seeded records partitioned strictly by patientId
const INITIAL_PATIENT_RECORDS: Record<string, ServerMedicalRecord[]> = {
  'user-arjun': [
    {
      id: 'rep-cbc-2026',
      patientId: 'user-arjun',
      title: 'Complete Blood Count (CBC) with Differential',
      category: 'blood',
      documentType: 'lab_report',
      date: '2026-10-05',
      formattedDate: '05 Oct 2026',
      isVerified: true,
      isDemo: true, // Clearly marked synthetic demo data
      summary: 'Hematological parameters within acceptable clinical limits.',
      metrics: [
        { name: 'Hemoglobin', value: '14.6', unit: 'g/dL', status: 'Normal' },
        { name: 'Total Leukocyte Count', value: '6800', unit: '/uL', status: 'Normal' },
        { name: 'Platelet Count', value: '265000', unit: '/uL', status: 'Normal' },
      ],
    },
    {
      id: 'rep-lipid-2026',
      patientId: 'user-arjun',
      title: 'Comprehensive Lipid Profile',
      category: 'lipid',
      documentType: 'lab_report',
      date: '2026-09-15',
      formattedDate: '15 Sep 2026',
      isVerified: true,
      isDemo: true, // Clearly marked synthetic demo data
      summary: 'Elevated total cholesterol and LDL. Recommend dietary modifications.',
      metrics: [
        { name: 'Total Cholesterol', value: '224', unit: 'mg/dL', status: 'High' },
        { name: 'LDL Cholesterol', value: '142', unit: 'mg/dL', status: 'High' },
        { name: 'HDL Cholesterol', value: '48', unit: 'mg/dL', status: 'Normal' },
        { name: 'Triglycerides', value: '175', unit: 'mg/dL', status: 'High' },
      ],
    },
    {
      id: 'rep-glucose-2026',
      patientId: 'user-arjun',
      title: 'Fasting Blood Glucose & HbA1c Glycated Hemoglobin',
      category: 'metabolic',
      documentType: 'lab_report',
      date: '2026-08-10',
      formattedDate: '10 Aug 2026',
      isVerified: true,
      isDemo: true, // Clearly marked synthetic demo data
      summary: 'Mildly elevated fasting blood sugar indicating prediabetic state.',
      metrics: [
        { name: 'Fasting Blood Sugar', value: '112', unit: 'mg/dL', status: 'High' },
        { name: 'HbA1c', value: '6.1', unit: '%', status: 'High' },
      ],
    },
    {
      id: 'rep-renal-2026',
      patientId: 'user-arjun',
      title: 'Renal Function Profile & Serum Electrolytes',
      category: 'general',
      documentType: 'lab_report',
      date: '2026-07-22',
      formattedDate: '22 Jul 2026',
      isVerified: false,
      isDemo: true, // Clearly marked synthetic demo data
      summary: 'Normal renal indices. Glomerular filtration rate is preserved.',
      metrics: [
        { name: 'Serum Creatinine', value: '0.92', unit: 'mg/dL', status: 'Normal' },
        { name: 'Blood Urea Nitrogen', value: '14', unit: 'mg/dL', status: 'Normal' },
      ],
    },
  ],
  'user-priya': [
    {
      id: 'rep-thyroid-priya',
      patientId: 'user-priya',
      title: 'Comprehensive Thyroid Panel (TSH, Free T3, Free T4)',
      category: 'metabolic',
      documentType: 'lab_report',
      date: '2026-09-01',
      formattedDate: '01 Sep 2026',
      isVerified: true,
      isDemo: true,
      summary: 'Thyroid stimulating hormone is well-controlled on maintenance therapy.',
      metrics: [
        { name: 'TSH', value: '2.4', unit: 'uIU/mL', status: 'Normal' },
        { name: 'Free T4', value: '1.2', unit: 'ng/dL', status: 'Normal' },
      ],
    },
  ],
  'user-guest': [], // Guest starts with zero records
};

let recordsStore: Record<string, ServerMedicalRecord[]> = {};

function initRecordsStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(RECORDS_FILE)) {
      const raw = fs.readFileSync(RECORDS_FILE, 'utf-8');
      recordsStore = JSON.parse(raw);
    } else {
      recordsStore = { ...INITIAL_PATIENT_RECORDS };
      fs.writeFileSync(RECORDS_FILE, JSON.stringify(recordsStore, null, 2), 'utf-8');
    }
  } catch {
    recordsStore = { ...INITIAL_PATIENT_RECORDS };
  }
}

function persistRecordsStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(recordsStore, null, 2), 'utf-8');
  } catch {
    // In-memory retained
  }
}

initRecordsStorage();

export function getRecordsForPatient(patientId: string): ServerMedicalRecord[] {
  return recordsStore[patientId] || [];
}

export function isRecordOwnedByOtherPatient(recordId: string, currentUserId: string): boolean {
  for (const [otherPatientId, otherRecords] of Object.entries(recordsStore)) {
    if (otherPatientId !== currentUserId && otherRecords.some((r) => r.id === recordId)) {
      return true;
    }
  }
  return false;
}

/**
 * Serverless Handler for /api/records
 * Enforces strict user authentication and privacy authorization
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Enforce Server-Side Authentication
  const auth = authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return res.status(auth.statusCode || 401).json({
      success: false,
      error: auth.error || 'Authentication required to access medical records.',
    });
  }

  const authenticatedUserId = auth.user.sub;

  // 2. GET /api/records or /api/records?id=<id>
  if (req.method === 'GET') {
    const recordId = req.query?.id || (req.url && req.url.includes('?id=') ? req.url.split('?id=')[1] : null);

    if (recordId) {
      // Individual record requested
      const userRecords = getRecordsForPatient(authenticatedUserId);
      const matched = userRecords.find((r) => r.id === recordId);

      if (matched) {
        return res.status(200).json({
          success: true,
          record: matched,
        });
      }

      // Check if record exists under another patient profile (Security Boundary Check)
      for (const [otherPatientId, otherRecords] of Object.entries(recordsStore)) {
        if (otherPatientId !== authenticatedUserId && otherRecords.some((r) => r.id === recordId)) {
          return res.status(403).json({
            success: false,
            error: 'Access Denied: Record does not belong to the authenticated user.',
          });
        }
      }

      return res.status(404).json({
        success: false,
        error: `Medical record ${recordId} not found.`,
      });
    }

    // List all records for authenticated user
    const records = getRecordsForPatient(authenticatedUserId);
    return res.status(200).json({
      success: true,
      userId: authenticatedUserId,
      records,
      count: records.length,
    });
  }

  // 3. POST /api/records — Upload or store verified record
  if (req.method === 'POST') {
    const body = req.body || {};
    const newRecord: ServerMedicalRecord = {
      ...body,
      patientId: authenticatedUserId, // Server enforces patient ownership
      isDemo: Boolean(body.isDemo), // Explicit tag preservation
    };

    if (!newRecord.id || !newRecord.title) {
      return res.status(400).json({ success: false, error: 'Record id and title are required.' });
    }

    const currentRecords = getRecordsForPatient(authenticatedUserId);
    const existingIndex = currentRecords.findIndex((r) => r.id === newRecord.id);

    let updated: ServerMedicalRecord[];
    if (existingIndex >= 0) {
      updated = [...currentRecords];
      updated[existingIndex] = newRecord;
    } else {
      updated = [newRecord, ...currentRecords];
    }

    recordsStore[authenticatedUserId] = updated;
    persistRecordsStorage();

    return res.status(200).json({
      success: true,
      record: newRecord,
      message: 'Medical record securely saved to server storage.',
    });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
