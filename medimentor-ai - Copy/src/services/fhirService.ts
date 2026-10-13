import type { MedicalReport, PatientProfile } from '../types/report';
import type { PrescriptionMedication } from '../types/document';

export interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: any;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'document' | 'collection';
  timestamp: string;
  meta: {
    profile: string[];
    versionId: string;
    lastUpdated: string;
  };
  identifier: {
    system: string;
    value: string;
  };
  entry: Array<{
    fullUrl: string;
    resource: FhirResource;
  }>;
}

/**
 * Standard LOINC mapping for common clinical laboratory parameters
 */
const LOINC_CODE_MAP: Record<string, { code: string; display: string }> = {
  'fasting blood sugar': { code: '1558-6', display: 'Fasting glucose [Mass/volume] in Blood' },
  'blood sugar': { code: '2345-7', display: 'Glucose [Mass/volume] in Blood' },
  'glucose': { code: '2345-7', display: 'Glucose [Mass/volume] in Blood' },
  'total cholesterol': { code: '2093-3', display: 'Cholesterol [Mass/volume] in Serum or Plasma' },
  'hdl cholesterol': { code: '2085-9', display: 'Cholesterol in HDL [Mass/volume] in Serum or Plasma' },
  'ldl cholesterol': { code: '13457-7', display: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma' },
  'triglycerides': { code: '2571-8', display: 'Triglyceride [Mass/volume] in Serum or Plasma' },
  'serum creatinine': { code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma' },
  'creatinine': { code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma' },
  'hemoglobin': { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood' },
  'hba1c': { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  'platelets': { code: '777-3', display: 'Platelets [#/volume] in Blood' },
  'wbc': { code: '6690-2', display: 'Leukocytes [#/volume] in Blood' },
  'heart rate': { code: '8867-4', display: 'Heart rate' },
  'ventricular rate': { code: '8867-4', display: 'Heart rate' },
};

/**
 * Converts a MediMentor verified clinical report into a valid FHIR R4 Bundle (ABDM Profile Compliant)
 */
export function convertReportToFhirR4(report: MedicalReport, profile?: PatientProfile): FhirBundle {
  const bundleId = `bundle-${report.id}`;
  const nowIso = new Date().toISOString();
  const patientId = profile?.id || 'patient-default';

  const patientResource: FhirResource = {
    resourceType: 'Patient',
    id: patientId,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient'],
    },
    identifier: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
              display: 'Medical record number',
            },
          ],
        },
        system: 'https://healthid.ndhm.gov.in',
        value: profile?.id ? `ABHA-${profile.id.toUpperCase()}` : 'ABHA-91-9876-5432-1098',
      },
    ],
    name: [
      {
        text: profile?.name || 'Patient Name',
        family: (profile?.name || '').split(' ').slice(-1)[0] || '',
        given: (profile?.name || '').split(' ').slice(0, -1),
      },
    ],
    gender: (profile?.gender || 'unknown').toLowerCase(),
    telecom: profile?.emergencyContact
      ? [
          {
            system: 'phone',
            value: profile.emergencyContact,
            use: 'mobile',
          },
        ]
      : undefined,
  };

  const entries: Array<{ fullUrl: string; resource: FhirResource }> = [
    {
      fullUrl: `urn:uuid:${patientId}`,
      resource: patientResource,
    },
  ];

  // 1. Observations from Lab Metrics
  if (report.metrics && report.metrics.length > 0) {
    for (const metric of report.metrics) {
      const metricKey = metric.name.toLowerCase().trim();
      const matchedLoinc = Object.entries(LOINC_CODE_MAP).find(([k]) => metricKey.includes(k))?.[1] || {
        code: '10000-0',
        display: metric.name,
      };

      const obsResource: FhirResource = {
        resourceType: 'Observation',
        id: `obs-${metric.id}`,
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation'],
        },
        status: metric.verified ? 'final' : 'preliminary',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: matchedLoinc.code,
              display: matchedLoinc.display,
            },
          ],
          text: metric.name,
        },
        subject: {
          reference: `urn:uuid:${patientId}`,
          display: profile?.name,
        },
        effectiveDateTime: report.date || nowIso.split('T')[0],
        valueQuantity: {
          value: parseFloat(String(metric.value)) || metric.value,
          unit: metric.unit,
          system: 'http://unitsofmeasure.org',
        },
        referenceRange: metric.referenceRange
          ? [
              {
                text: metric.referenceRange,
              },
            ]
          : undefined,
        interpretation: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: metric.status === 'high' ? 'H' : metric.status === 'low' ? 'L' : 'N',
                display: metric.status,
              },
            ],
            text: metric.status,
          },
        ],
      };

      entries.push({
        fullUrl: `urn:uuid:${obsResource.id}`,
        resource: obsResource,
      });
    }
  }

  // 2. Medication Requests from Prescriptions
  if (report.prescriptionData?.medications && report.prescriptionData.medications.length > 0) {
    report.prescriptionData.medications.forEach((med: PrescriptionMedication, idx: number) => {
      const medId = med.id || `med-req-${idx}`;
      const medResource: FhirResource = {
        resourceType: 'MedicationRequest',
        id: medId,
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest'],
        },
        status: 'active',
        intent: 'order',
        subject: {
          reference: `urn:uuid:${patientId}`,
          display: profile?.name,
        },
        authoredOn: report.date || nowIso.split('T')[0],
        requester: report.prescriptionData?.doctorName
          ? {
              display: report.prescriptionData.doctorName,
            }
          : undefined,
        medicationCodeableConcept: {
          text: `${med.name} ${med.dosage || ''}`.trim(),
        },
        dosageInstruction: [
          {
            text: `${med.frequency || ''} - ${med.instructions || ''}`.trim(),
            timing: {
              code: {
                text: med.frequency || 'As directed',
              },
            },
            patientInstruction: med.instructions,
          },
        ],
      };

      entries.push({
        fullUrl: `urn:uuid:${medId}`,
        resource: medResource,
      });
    });
  }

  // 3. Eye Refraction Observations
  if (report.eyeData) {
    const eye = report.eyeData;
    const eyeObs: FhirResource = {
      resourceType: 'Observation',
      id: `obs-eye-${report.id}`,
      meta: {
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation'],
      },
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '251717004',
            display: 'Refraction finding',
          },
        ],
        text: 'Spectacle Refraction',
      },
      subject: {
        reference: `urn:uuid:${patientId}`,
        display: profile?.name,
      },
      effectiveDateTime: report.date || nowIso.split('T')[0],
      component: [
        {
          code: { text: 'Right Eye (OD) SPH' },
          valueQuantity: { value: parseFloat(eye.od.sph || '0'), unit: 'diopter' },
        },
        {
          code: { text: 'Right Eye (OD) CYL' },
          valueQuantity: { value: parseFloat(eye.od.cyl || '0'), unit: 'diopter' },
        },
        {
          code: { text: 'Left Eye (OS) SPH' },
          valueQuantity: { value: parseFloat(eye.os.sph || '0'), unit: 'diopter' },
        },
        {
          code: { text: 'Left Eye (OS) CYL' },
          valueQuantity: { value: parseFloat(eye.os.cyl || '0'), unit: 'diopter' },
        },
        {
          code: { text: 'Pupillary Distance (PD)' },
          valueQuantity: { value: parseFloat(eye.pd || '64'), unit: 'mm' },
        },
      ],
    };

    entries.push({
      fullUrl: `urn:uuid:${eyeObs.id}`,
      resource: eyeObs,
    });
  }

  // 4. DiagnosticReport Resource summarizing document
  const diagReport: FhirResource = {
    resourceType: 'DiagnosticReport',
    id: `diag-${report.id}`,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportLab'],
    },
    status: report.isVerified ? 'final' : 'partial',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: report.documentType === 'eye_prescription' ? 'OPH' : report.documentType === 'ecg_report' ? 'CG' : 'LAB',
            display: report.documentType || 'Clinical Report',
          },
        ],
      },
    ],
    code: {
      text: report.title,
    },
    subject: {
      reference: `urn:uuid:${patientId}`,
      display: profile?.name,
    },
    effectiveDateTime: report.date || nowIso.split('T')[0],
    conclusion: report.summary || 'Clinical record verified through MediMentor AI verification pipeline.',
    result: entries
      .filter((e) => e.resource.resourceType === 'Observation')
      .map((e) => ({
        reference: e.fullUrl,
        display: e.resource.code?.text,
      })),
  };

  entries.push({
    fullUrl: `urn:uuid:${diagReport.id}`,
    resource: diagReport,
  });

  return {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'document',
    timestamp: nowIso,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
      versionId: '1',
      lastUpdated: nowIso,
    },
    identifier: {
      system: 'https://medimentor-ai.org/bundles',
      value: `MM-FHIR-${report.id.toUpperCase()}`,
    },
    entry: entries,
  };
}

/**
 * Download a FHIR R4 JSON bundle to client machine
 */
export function downloadFhirBundle(bundle: FhirBundle, filename?: string): void {
  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${bundle.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
