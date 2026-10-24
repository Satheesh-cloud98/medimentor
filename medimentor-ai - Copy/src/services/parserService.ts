import type {
  ExtractedDocumentData,
  EyePrescriptionData,
  EcgReportData,
  RadiologyReportData,
  PrescriptionData,
  DischargeSummaryData,
  DocumentClassificationResult,
} from '../types/document';
import type { MedicalMetric } from '../types/report';

/**
 * Specialty-Specific Medical Parser
 * Applies targeted extraction schemas according to the document classification.
 */
export function parseSpecialtyDocument(
  text: string,
  classification: DocumentClassificationResult
): ExtractedDocumentData {
  const result: ExtractedDocumentData = {
    classification,
    documentDate: extractDate(text),
    patientName: extractPatientName(text),
    facilityName: extractFacilityName(text),
    labMetrics: [],
  };

  switch (classification.type) {
    case 'eye_prescription':
      result.eyeData = parseEyePrescription(text);
      break;

    case 'urine_test':
    case 'lab_report':
      result.labMetrics = parseLabReport(text, classification.type);
      break;

    case 'ecg_report':
      result.ecgData = parseEcgReport(text);
      break;

    case 'radiology_report':
      result.radiologyData = parseRadiologyReport(text);
      break;

    case 'prescription':
      result.prescriptionData = parsePrescription(text);
      break;

    case 'discharge_summary':
      result.dischargeData = parseDischargeSummary(text);
      break;

    case 'unsupported':
    default:
      // Unsupported documents do not get arbitrary lab metrics assigned
      break;
  }

  return result;
}

/**
 * 1. Eye Prescription Extraction
 * Extracts: OD, OS, SPH, CYL, AXIS, ADD, Visual Acuity (VA), and PD
 */
export function parseEyePrescription(text: string): EyePrescriptionData {
  const lines = text.split(/\r?\n/);
  const data: EyePrescriptionData = {
    od: {},
    os: {},
  };

  // Find Pupillary Distance (PD / IPD)
  const pdMatch = text.match(/(?:p\.?d\.?|ipd|pupillary\s+dist(?:ance)?)(?:\s*\([^)]*\))?\s*[:=]?\s*(\d{2}(?:\.\d)?)(?:\s*mm)?/i);
  if (pdMatch && pdMatch[1]) {
    data.pd = pdMatch[0].toLowerCase().includes('mm') ? `${pdMatch[1].trim()} mm` : pdMatch[1].trim();
  }

  // Helper to extract SPH, CYL, AXIS, ADD, VA from a line
  const parseEyeLine = (line: string): { sph?: string; cyl?: string; axis?: string; add?: string; va?: string } => {
    const res: { sph?: string; cyl?: string; axis?: string; add?: string; va?: string } = {};

    const numbersWithSign = line.match(/(?:[+-]\s*\d+\.?\d*|\bplano\b|\bpl\b|\bds\b)/gi) || [];
    const axisMatch = line.match(/(?:(?:axis|ax)\s*[:=]?\s*(\d{1,3})|(?:@|\bx\b)\s*(\d{1,3})|(\d{1,3})\s*(?:°|deg))/i);
    const vaMatch = line.match(/(?:va|visual\s+acuity|v\/a)\s*[:=]?\s*([62]0?\/\d{1,2}|6\/6|20\/20)/i);
    const addMatch = line.match(/(?:add|addition|near)\s*[:=]?\s*([+-]?\s*\d+\.?\d*)/i);

    const firstNum = numbersWithSign[0];
    if (firstNum) {
      res.sph = firstNum.replace(/\s+/g, '');
    }
    const secondNum = numbersWithSign[1];
    if (secondNum) {
      res.cyl = secondNum.replace(/\s+/g, '');
    }
    const rawAxis = axisMatch ? (axisMatch[1] || axisMatch[2] || axisMatch[3]) : undefined;
    if (rawAxis) {
      const axisVal = parseInt(rawAxis, 10);
      if (axisVal >= 1 && axisVal <= 180) {
        res.axis = `${axisVal}°`;
      }
    }
    if (addMatch && addMatch[1]) {
      res.add = addMatch[1].replace(/\s+/g, '');
    }
    if (vaMatch && vaMatch[1]) {
      res.va = vaMatch[1];
    }

    return res;
  };

  // Scan for OD (Right Eye) and OS (Left Eye) rows
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Right Eye line
    if (/\b(od|r|right|o\.d\.)\b/i.test(line) && !/doctor|period/i.test(line)) {
      const parsed = parseEyeLine(line);
      data.od = { ...data.od, ...parsed };
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine && Object.keys(data.od).length < 2) {
          const nextParsed = parseEyeLine(nextLine);
          data.od = { ...data.od, ...nextParsed };
        }
      }
    }

    // Left Eye line
    if (/\b(os|l|left|o\.s\.)\b/i.test(line) && !/hospital|post/i.test(line)) {
      const parsed = parseEyeLine(line);
      data.os = { ...data.os, ...parsed };
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine && Object.keys(data.os).length < 2) {
          const nextParsed = parseEyeLine(nextLine);
          data.os = { ...data.os, ...nextParsed };
        }
      }
    }
  }

  // Default fallbacks if structured columns exist without explicit OD/OS labels
  if (!data.od.sph && !data.os.sph) {
    const allSignedNumbers = text.match(/[+-]\d+\.\d{2}/g);
    if (allSignedNumbers && allSignedNumbers.length >= 2) {
      const s0 = allSignedNumbers[0];
      const s1 = allSignedNumbers[1];
      if (s0) data.od.sph = s0;
      if (s1) data.os.sph = s1;
      if (allSignedNumbers.length >= 4) {
        const s2 = allSignedNumbers[2];
        const s3 = allSignedNumbers[3];
        if (s2) data.od.cyl = s2;
        if (s3) data.os.cyl = s3;
      }
    }
  }

  return data;
}

/**
 * 2. Lab & Blood & Urine Test Extraction
 */
export function parseLabReport(text: string, subType: 'lab_report' | 'urine_test'): MedicalMetric[] {
  const metrics: MedicalMetric[] = [];
  const lines = text.split(/\r?\n/);

  const COMMON_TESTS = [
    { name: 'Hemoglobin (Hb)', match: /hemo(?:glo)?bin\b/i, defaultUnit: 'g/dL', normal: '13.0 - 17.0' },
    { name: 'Total Leukocyte Count (WBC)', match: /(?:total\s+)?(?:leuko|wbc)\w*\s*(?:count)?/i, defaultUnit: 'cells/mcL', normal: '4000 - 11000' },
    { name: 'Platelet Count', match: /platelet\w*\s*(?:count)?/i, defaultUnit: '/mcL', normal: '150000 - 450000' },
    { name: 'Packed Cell Volume (PCV)', match: /(?:packed\s+cell\s+volume|pcv|hematocrit)\b/i, defaultUnit: '%', normal: '40.0 - 50.0' },
    { name: 'Mean Corpuscular Volume (MCV)', match: /(?:mean\s+corpuscular\s+volume|mcv)\b/i, defaultUnit: 'fL', normal: '80.0 - 100.0' },
    { name: 'Total Cholesterol', match: /total\s+cholesterol/i, defaultUnit: 'mg/dL', normal: '< 200' },
    { name: 'LDL Cholesterol', match: /ldl(?:\s+cholesterol)?/i, defaultUnit: 'mg/dL', normal: '< 100' },
    { name: 'HDL Cholesterol', match: /hdl(?:\s+cholesterol)?/i, defaultUnit: 'mg/dL', normal: '> 40' },
    { name: 'Triglycerides', match: /triglyceride/i, defaultUnit: 'mg/dL', normal: '< 150' },
    { name: 'Fasting Blood Glucose', match: /fasting(?:\s+blood)?\s+(?:glucose|sugar)/i, defaultUnit: 'mg/dL', normal: '70 - 99' },
    { name: 'HbA1c', match: /hba1c|glycated\s+hemo/i, defaultUnit: '%', normal: '< 5.7' },
    { name: 'Serum Creatinine', match: /(?:serum\s+)?creatinine/i, defaultUnit: 'mg/dL', normal: '0.70 - 1.20' },
    { name: 'Blood Urea Nitrogen (BUN)', match: /urea|bun/i, defaultUnit: 'mg/dL', normal: '7 - 20' },
    { name: 'Serum Bilirubin', match: /bilirubin/i, defaultUnit: 'mg/dL', normal: '0.2 - 1.2' },
    { name: 'Urine Pus Cells', match: /pus\s+cells/i, defaultUnit: '/HPF', normal: '0 - 5' },
    { name: 'Urine Epithelial Cells', match: /epithelial\s+cells/i, defaultUnit: '/HPF', normal: '0 - 5' },
    { name: 'Urine Specific Gravity', match: /specific\s+gravity/i, defaultUnit: '', normal: '1.005 - 1.030' },
    { name: 'Urine pH / Reaction', match: /\b(?:reaction|ph)\b/i, defaultUnit: '', normal: '4.5 - 8.0' },
    { name: 'Urine Glucose', match: /urine\s+glucose/i, defaultUnit: '', normal: 'Negative' },
    { name: 'Urine Protein', match: /urine\s+protein/i, defaultUnit: '', normal: 'Negative' },
    { name: 'Urine Ketones', match: /urine\s+ketones/i, defaultUnit: '', normal: 'Negative' },
  ];

  for (const line of lines) {
    for (const testDef of COMMON_TESTS) {
      const testMatch = line.match(testDef.match);
      if (testMatch && testMatch.index !== undefined && !metrics.some((m) => m.name === testDef.name)) {
        // Evaluate only the text that follows the test name to avoid capturing leading serial numbers
        const afterTest = line.slice(testMatch.index + testMatch[0].length);

        // Check for qualitative results (Negative, Positive, Trace, Nil, Normal) or numeric results
        const qualMatch = afterTest.match(/[:=]?\s*\b(negative|positive|trace|nil|absent|present|normal)\b/i);
        const numMatch = afterTest.match(/[:=]?\s*(\d+(?:\.\d+)?)/);

        let val = '';
        if (qualMatch && (!numMatch || (qualMatch.index || 0) <= (numMatch.index || 999))) {
          val = qualMatch[1].charAt(0).toUpperCase() + qualMatch[1].slice(1).toLowerCase();
        } else if (numMatch && numMatch[1]) {
          val = numMatch[1];
        }

        if (val) {
          // Extract reference range from after the test name
          const rangeMatch = afterTest.match(/(?:(?:ref|reference|normal|biological)?\s*(?:range)?\s*[:=]?\s*)?(?:[<>]=?\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?|\bnegative\b|\bnormal\b|\bnil\b)/i);
          const range = rangeMatch ? rangeMatch[0].replace(/^(?:ref|reference|range)[:=]?\s*/i, '').trim() : testDef.normal;

          // Extract unit
          const unitMatch = afterTest.match(/(?:mg\/dL|g\/dL|mmol\/L|\/uL|\/mcL|cells\/mcL|%|\/HPF|fL|pg)/i);
          const unit = unitMatch ? unitMatch[0] : testDef.defaultUnit;

          let status: 'normal' | 'high' | 'low' | 'attention' = 'normal';
          const numVal = parseFloat(val);
          if (!isNaN(numVal)) {
            if (testDef.name.includes('Cholesterol') && numVal > 200) status = 'high';
            if (testDef.name.includes('LDL') && numVal > 100) status = 'high';
            if (testDef.name.includes('Triglycerides') && numVal > 150) status = 'high';
            if (testDef.name.includes('Glucose') && numVal > 100) status = 'high';
            if (testDef.name.includes('HbA1c') && numVal > 5.7) status = 'high';
            if (testDef.name.includes('Hemoglobin') && numVal < 12.0) status = 'low';
            if (testDef.name.includes('Creatinine') && numVal > 1.2) status = 'high';
          } else if (/positive|trace/i.test(val)) {
            status = 'attention';
          }

          metrics.push({
            id: `ext-${Date.now()}-${metrics.length}`,
            name: testDef.name,
            value: val,
            unit,
            referenceRange: range,
            status,
            verified: false,
            notes: `Extracted from ${subType === 'urine_test' ? 'Urinalysis' : 'Laboratory report'}.`,
          });
        }
      }
    }
  }

  // Generic fallback if no common test matched
  if (metrics.length === 0) {
    const genericMatches = text.matchAll(/^([A-Za-z\s()/-]{3,30})\s+(\d+(?:\.\d+)?)\s*([A-Za-z/%]+)?/gm);
    for (const match of genericMatches) {
      const name = match[1]?.trim();
      const val = match[2];
      const unit = match[3] || '';
      if (name && val && name.length > 2 && !/page|date|doctor|report|patient/i.test(name)) {
        metrics.push({
          id: `ext-${Date.now()}-${metrics.length}`,
          name,
          value: val,
          unit,
          referenceRange: 'See Original',
          status: 'normal',
          verified: false,
        });
      }
    }
  }

  return metrics;
}

/**
 * 3. ECG Report Extraction
 */
export function parseEcgReport(text: string): EcgReportData {
  const data: EcgReportData = {};

  const rateMatch = text.match(/(?:ventricular\s+rate|heart\s+rate|hr)\s*[:=]?\s*(\d{2,3})\s*(?:bpm)?/i);
  if (rateMatch && rateMatch[1]) {
    data.ventricularRate = `${rateMatch[1]} bpm`;
    data.heartRate = rateMatch[1];
  }

  const prMatch = text.match(/pr\s+(?:interval|int)?\s*[:=]?\s*(\d{2,3})\s*(?:ms)?/i);
  if (prMatch && prMatch[1]) data.prInterval = `${prMatch[1]} ms`;

  const qrsMatch = text.match(/qrs\s+(?:duration|dur)?\s*[:=]?\s*(\d{2,3})\s*(?:ms)?/i);
  if (qrsMatch && qrsMatch[1]) data.qrsDuration = `${qrsMatch[1]} ms`;

  const qtMatch = text.match(/qt\/qtc\s*[:=]?\s*(\d{2,3}\/\d{2,3})/i);
  if (qtMatch && qtMatch[1]) {
    data.qtcInterval = qtMatch[1];
  }

  const rhythmMatch = text.match(/(?:normal\s+sinus\s+rhythm|sinus\s+tachycardia|sinus\s+bradycardia|atrial\s+fibrillation)/i);
  if (rhythmMatch) data.rhythm = rhythmMatch[0];

  const impMatch = text.match(/(?:interpretation|impression|conclusion)\s*[:=]([\s\S]*?)(?:\n\n|$)/i);
  if (impMatch && impMatch[1]) data.impression = impMatch[1].trim().slice(0, 200);

  return data;
}

/**
 * 4. Radiology Report Extraction
 */
export function parseRadiologyReport(text: string): RadiologyReportData {
  const data: RadiologyReportData = { findings: [] };

  if (/ct\s+scan|computed\s+tomography/i.test(text)) data.modality = 'CT Scan';
  else if (/mri|magnetic\s+resonance/i.test(text)) data.modality = 'MRI';
  else if (/ultrasound|sonography|usg/i.test(text)) data.modality = 'Ultrasound';
  else data.modality = 'X-Ray';

  if (/chest/i.test(text)) data.bodyRegion = 'Chest';
  else if (/brain|head/i.test(text)) data.bodyRegion = 'Brain / Cranial';
  else if (/abdomen|pelvis/i.test(text)) data.bodyRegion = 'Abdomen & Pelvis';
  else if (/spine/i.test(text)) data.bodyRegion = 'Spine';

  const findingsMatch = text.match(/findings\s*[:=]([\s\S]*?)(?:impression|conclusion|$)/i);
  if (findingsMatch && findingsMatch[1]) {
    const rawFindings = findingsMatch[1].trim().split(/\r?\n/).filter((l) => l.trim().length > 5);
    data.findings = rawFindings.slice(0, 5);
  }

  const impMatch = text.match(/(?:impression|conclusion)\s*[:=]([\s\S]*?)(?:\n\n|$)/i);
  if (impMatch && impMatch[1]) {
    data.impression = impMatch[1].trim().slice(0, 250);
  }

  return data;
}

/**
 * 5. Medication Prescription Extraction
 */
export function parsePrescription(text: string): PrescriptionData {
  const data: PrescriptionData = { medications: [] };

  // Doctor name
  const docMatch = text.match(/(?:dr\.|doctor|physician|prescribed\s+by)\s*[:=]?\s*([A-Za-z.\s]{3,35})/i);
  if (docMatch && docMatch[1]) {
    data.doctorName = docMatch[1].trim();
  }

  // Clinic / hospital
  const clinicMatch = text.match(/(?:clinic|hospital|centre|center|healthcare|pharmacy|polyclinic)\s*[:=]\s*([A-Za-z0-9&.,\s]{3,45})/i);
  if (clinicMatch && clinicMatch[1]) {
    const val = clinicMatch[1].trim();
    data.hospitalOrClinic = val;
    data.clinicOrHospital = val;
  } else {
    const clinicLine = text.split(/\r?\n/).slice(0, 6).find((l) => /(?:hospital|clinic|polyclinic|dispensary|medical centre|health center)\b/i.test(l));
    if (clinicLine) {
      const cleaned = clinicLine.replace(/^(?:hospital|clinic|facility)\s*[:=]?\s*/i, '').trim();
      data.hospitalOrClinic = cleaned;
      data.clinicOrHospital = cleaned;
    }
  }

  // Patient name
  const ptMatch = text.match(/(?:patient(?:\s+name)?|name|pt\.?\s*name)\s*[:=]?\s*([A-Za-z.\s]{2,35})/i);
  if (ptMatch && ptMatch[1]) {
    data.patientName = ptMatch[1].trim();
  }

  // Date
  const dateMatch = text.match(/(?:date|prescribed\s+on)\s*[:=]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (dateMatch && dateMatch[1]) {
    data.prescriptionDate = dateMatch[1].trim();
  }

  // Complaint or diagnosis
  const complaintMatch = text.match(/(?:complaint|chief\s+complaint|diagnosis|impression|notes|clinical\s+notes)\s*[:=]?\s*([^\n\r]+)/i);
  if (complaintMatch && complaintMatch[1]) {
    data.complaintOrDiagnosis = complaintMatch[1].trim().slice(0, 150);
  }

  // Advice or instructions
  const adviceMatch = text.match(/(?:advice|instructions?|rx\s+advice|plan|precaution)\s*[:=]?\s*([^\n\r]+)/i);
  if (adviceMatch && adviceMatch[1]) {
    data.adviceOrInstructions = adviceMatch[1].trim().slice(0, 200);
  }

  // Check for explicit "Medication: Not specified" or "None"
  const medHeaderMatch = text.match(/medication\s*[:=]?\s*([^\n\r]+)/i);
  if (medHeaderMatch && medHeaderMatch[1]) {
    const medVal = medHeaderMatch[1].trim();
    if (/not\s+specified|none|nil|n\/a/i.test(medVal)) {
      data.medicationsNotes = 'Not specified in document';
    }
  }

  // Extract individual medications from lines
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip headers and metadata lines
    if (/patient|complaint|advice|purpose|demo|clinical notes|date|doctor|hospital|clinic/i.test(trimmed)) {
      continue;
    }

    if (
      /\b(?:tab|tablet|cap|capsule|syrup|suspension|inj|injection|gel|drops?|ointment|cream|inhaler)\b/i.test(trimmed) ||
      /\b\d+\s*(?:mg|ml|mcg|g)\b/i.test(trimmed)
    ) {
      const freqMatch = trimmed.match(/\b(1-0-1|0-1-0|1-1-1|1-0-0|0-0-1|od|bd|tds|qid|bid|tid|daily|weekly|prn|sos|hs)\b/i);
      const doseMatch = trimmed.match(/\b(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|iu))\b/i);
      const instrMatch = trimmed.match(/\b(?:before|after|with)\s+(?:food|meals)\b/i);

      let cleanName = trimmed
        .replace(/^[0-9.)\-*•]+\s*/, '')
        .replace(/\b(?:tab|tablet|cap|capsule|syrup|suspension|inj|injection|gel|drops?|ointment|cream|inhaler)\b\.?\s*/gi, '')
        .replace(/^[0-9.)\-*•\s]+/, '')
        .trim();

      if (doseMatch && doseMatch[1]) {
        cleanName = cleanName.replace(doseMatch[1], '');
      }
      if (freqMatch && freqMatch[1]) {
        cleanName = cleanName.replace(freqMatch[1], '');
      }
      if (instrMatch && instrMatch[0]) {
        cleanName = cleanName.replace(instrMatch[0], '');
      }
      cleanName = cleanName
        .replace(/\b(?:twice|once|thrice|daily|times|for|\d+\s*days?)\b/gi, '')
        .replace(/[-–—:()]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const finalName = cleanName.length > 1
        ? cleanName.slice(0, 45)
        : trimmed.replace(/^[0-9.)\-*•]+\s*/, '').slice(0, 40);

      data.medications.push({
        id: `med-${Date.now()}-${data.medications.length}`,
        name: finalName,
        dosage: doseMatch && doseMatch[1] ? doseMatch[1] : undefined,
        frequency: freqMatch && freqMatch[1] ? freqMatch[1].toUpperCase() : undefined,
        instructions: instrMatch && instrMatch[0] ? instrMatch[0] : undefined,
      });
    }
  }

  if (data.medications.length === 0 && !data.medicationsNotes) {
    data.medicationsNotes = 'No specific medications detected in document';
  }

  return data;
}

/**
 * 6. Discharge Summary Extraction
 */
export function parseDischargeSummary(text: string): DischargeSummaryData {
  const data: DischargeSummaryData = {};

  const admMatch = text.match(/(?:admission|admitted)\s*(?:date)?\s*[:=]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/i);
  if (admMatch && admMatch[1]) data.admissionDate = admMatch[1];

  const disMatch = text.match(/(?:discharge)\s*(?:date)?\s*[:=]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/i);
  if (disMatch && disMatch[1]) data.dischargeDate = disMatch[1];

  const diagMatch = text.match(/(?:diagnosis\s+at\s+discharge|final\s+diagnosis|discharge\s+diagnosis|primary\s+diagnosis|diagnosis)\s*[:=]\s*([^\n\r.]+)/i);
  if (diagMatch && diagMatch[1]) {
    data.primaryDiagnosis = diagMatch[1].trim();
    data.dischargeDiagnosis = diagMatch[1].trim();
  }

  return data;
}

// Utility regex helpers
function extractDate(text: string): string | undefined {
  const match = text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i);
  return match && match[1] ? match[1] : undefined;
}

function extractPatientName(text: string): string | undefined {
  const match = text.match(/(?:patient(?:\s+name)?|name|pt\.?\s*name)\s*[:=]?\s*([A-Z][a-zA-Z\s.]{2,30})/);
  return match && match[1] ? match[1].trim() : undefined;
}

function extractFacilityName(text: string): string | undefined {
  const match = text.match(/(?:hospital|clinic|diagnostics|laboratory|pathology|imaging|centre|center)\b/i);
  if (match) {
    const lines = text.split(/\r?\n/).slice(0, 5);
    const line = lines.find((l) => /hospital|clinic|diagnostics|lab/i.test(l));
    return line ? line.trim().slice(0, 50) : undefined;
  }
  return undefined;
}
