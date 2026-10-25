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
      if (result.prescriptionData.patientName) result.patientName = result.prescriptionData.patientName;
      if (result.prescriptionData.patientAge) result.patientAge = result.prescriptionData.patientAge;
      if (result.prescriptionData.patientGender) result.patientGender = result.prescriptionData.patientGender;
      if (result.prescriptionData.prescriptionDate) result.documentDate = result.prescriptionData.prescriptionDate;
      if (result.prescriptionData.hospitalOrClinic) result.facilityName = result.prescriptionData.hospitalOrClinic;
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
 * Extracts granular patient & clinical metadata and separated medicine fields.
 */
export function parsePrescription(text: string): PrescriptionData {
  const data: PrescriptionData = { medications: [] };

  const lines = text.split(/\r?\n/);

  // 1. Patient Metadata
  // Patient Name: strict match; avoid Dr, Clinic, Hospital, Age, Sex, UHID
  const ptLine = lines.find((l) => /(?:patient(?:\s+name)?|pt\.?\s*name|^\s*name)\s*[:=]/i.test(l));
  if (ptLine) {
    const rawPt = ptLine.replace(/(?:patient(?:\s+name)?|pt\.?\s*name|^\s*name)\s*[:=]\s*/i, '');
    const cleanPt = rawPt.split(/[|,;/]|\b(?:age|sex|gender|uhid|mrn|dr\.|date)\b/i)[0].trim();
    if (cleanPt && !/^(?:dr\.?|hospital|clinic|doctor|patient|name)\b/i.test(cleanPt) && cleanPt.length >= 2) {
      data.patientName = cleanPt;
    }
  }

  // Age: look for Age: 42 or 42 yrs or 42/M
  const ageMatch = text.match(/\b(?:age|yr?s?\.?\s*old)\s*[:=]?\s*(\d{1,3})\s*(?:yrs|years|y|yo)?\b/i) ||
                   text.match(/\b(\d{1,3})\s*(?:yrs|years|-year-old)\b/i) ||
                   text.match(/(?:male|female|m|f)\s*[/|,]\s*(\d{1,3})\b/i) ||
                   text.match(/\b(\d{1,3})\s*[/|,]\s*(?:male|female|m|f)\b/i);
  if (ageMatch && ageMatch[1]) {
    const ageNum = parseInt(ageMatch[1], 10);
    if (ageNum > 0 && ageNum < 125) {
      data.patientAge = `${ageNum}`;
    }
  }

  // Gender / Sex
  const genderMatch = text.match(/\b(?:gender|sex)\s*[:=]?\s*(male|female|other|m|f)\b/i) ||
                      text.match(/\b(male|female)\b/i);
  if (genderMatch && genderMatch[1]) {
    const g = genderMatch[1].trim().toLowerCase();
    if (g === 'm' || g === 'male') data.patientGender = 'Male';
    else if (g === 'f' || g === 'female') data.patientGender = 'Female';
    else data.patientGender = 'Other';
  }

  // Patient ID / UHID (strictly patient identifiers, never doctor registration numbers)
  const uhidMatch = text.match(/\b(?:uhid|mrn|patient\s*(?:id|reg|no|uid)|pid|ipd\s*no\.?|opd\s*no\.?)\s*[:=]?\s*([A-Za-z0-9\-_/]{3,30})\b/i);
  if (uhidMatch && uhidMatch[1]) {
    data.patientUhid = uhidMatch[1].trim();
  }

  // Prescription Date
  const dateMatch = text.match(/(?:date|prescribed\s+on|dated|rx\s+date)\s*[:=]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (dateMatch && dateMatch[1]) {
    data.prescriptionDate = dateMatch[1].trim();
  } else {
    // Check top 6 lines for standard date format
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const lineDate = lines[i].match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/);
      if (lineDate && lineDate[1]) {
        data.prescriptionDate = lineDate[1];
        break;
      }
    }
  }

  // 2. Doctor & Facility Metadata
  // Doctor Name
  const docMatch = text.match(/(?:dr\.|doctor|physician|prescribed\s+by)\s*[:=]?\s*([A-Za-z.\s]{3,40})/i);
  if (docMatch && docMatch[1]) {
    let rawDoc = docMatch[1].trim();
    // Separate qualifications from doctor name if on the same line
    const qualInDoc = rawDoc.match(/,\s*([A-Za-z.,\s()]+)$/);
    if (qualInDoc && qualInDoc[1]) {
      data.doctorQualification = qualInDoc[1].trim();
      rawDoc = rawDoc.replace(/,\s*[A-Za-z.,\s()]+$/, '').trim();
    }
    // Clean name
    const cleanedDoc = rawDoc.replace(/^(?:dr\.?|doctor)\s*/i, '').trim();
    data.doctorName = cleanedDoc ? `Dr. ${cleanedDoc}` : rawDoc;
  }

  // Doctor Qualification & Registration Number (single line only)
  const qualMatch = text.match(/\b(MBBS|MD|MS|DNB|BAMS|BHMS|BDS|MDS|DM|MCh|FRCP|MRCP|MRCS|FRCS|Diploma|Fellowship)\b[^\n\r]*/i);
  const regMatch = text.match(/\b(?:reg(?:istration)?\.?\s*(?:no\.?)?)\s*[:=]?\s*([A-Za-z0-9\-_/]+)\b/i);
  if (!data.doctorQualification && qualMatch && qualMatch[0]) {
    data.doctorQualification = qualMatch[0].trim().replace(/,\s*$/, '');
  }
  if (regMatch && regMatch[1]) {
    const regStr = `Reg No: ${regMatch[1].trim()}`;
    if (!data.doctorQualification) {
      data.doctorQualification = regStr;
    } else if (!data.doctorQualification.includes(regMatch[1].trim())) {
      data.doctorQualification = `${data.doctorQualification} (${regStr})`;
    }
  }

  // Clinic / Hospital
  const clinicMatch = text.match(/(?:clinic|hospital|centre|center|healthcare|pharmacy|polyclinic)\s*[:=]\s*([A-Za-z0-9&.,\s]{3,45})/i);
  if (clinicMatch && clinicMatch[1]) {
    const val = clinicMatch[1].trim();
    data.hospitalOrClinic = val;
    data.clinicOrHospital = val;
  } else {
    const clinicLine = lines.slice(0, 6).find((l) => /(?:hospital|clinic|polyclinic|dispensary|medical centre|health center)\b/i.test(l));
    if (clinicLine) {
      const cleaned = clinicLine.replace(/^(?:hospital|clinic|facility)\s*[:=]?\s*/i, '').trim();
      data.hospitalOrClinic = cleaned;
      data.clinicOrHospital = cleaned;
    }
  }

  // Hospital Address & Contact Details
  const contactMatch = text.match(/(?:ph(?:one)?|tel|mob(?:ile)?|contact|call)\s*[:=]?\s*([+0-9\s\-()]{7,22})/i);
  const emailMatch = text.match(/(?:email|mail)\s*[:=]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const addressLine = lines.slice(0, 8).find((l) => /\b(?:street|road|nagar|cross|layout|floor|building|opp|near|pin(?:code)?\s*[:=]?\s*\d{5,6})\b/i.test(l));

  const contactParts: string[] = [];
  if (addressLine) contactParts.push(addressLine.trim());
  if (contactMatch && contactMatch[1]) contactParts.push(`Phone: ${contactMatch[1].trim()}`);
  if (emailMatch && emailMatch[1]) contactParts.push(`Email: ${emailMatch[1].trim()}`);
  if (contactParts.length > 0) {
    data.hospitalAddressContact = contactParts.join(' | ');
  }

  // Complaint or diagnosis
  const complaintLineIdx = lines.findIndex((l) => /(?:complaint|chief\s+complaint|diagnosis|clinical\s+notes)\s*[:=]/i.test(l));
  if (complaintLineIdx !== -1) {
    const l = lines[complaintLineIdx];
    let val = l.replace(/^[^:=]*[:=]\s*/i, '').trim();
    val = val.replace(/^(?:chief\s+complaint|diagnosis|clinical\s+notes|notes)\s*[:=]?\s*/i, '').trim();
    if (!val && lines[complaintLineIdx + 1] && !lines[complaintLineIdx + 1].includes(':')) {
      val = lines[complaintLineIdx + 1].trim();
    }
    if (val) data.complaintOrDiagnosis = val.slice(0, 150);
  }

  // Advice or instructions
  const adviceLineIdx = lines.findIndex((l) => /(?:advice|instructions?|rx\s+advice|plan|precaution)\s*[:=]?$/i.test(l.trim()) || /(?:advice|instructions?|rx\s+advice|plan)\s*[:=]/i.test(l));
  if (adviceLineIdx !== -1) {
    const l = lines[adviceLineIdx];
    let val = l.replace(/^[^:=]*[:=]\s*/i, '').trim();
    val = val.replace(/^(?:instructions?|advice|plan)\s*[:=]?\s*/i, '').trim();
    if (!val && lines[adviceLineIdx + 1] && !lines[adviceLineIdx + 1].includes(':')) {
      val = lines[adviceLineIdx + 1].trim();
    }
    if (val) data.adviceOrInstructions = val.slice(0, 200);
  }

  // Check for explicit "Medication: Not specified" or "None"
  const medHeaderMatch = text.match(/medication\s*[:=]?\s*([^\n\r]+)/i);
  if (medHeaderMatch && medHeaderMatch[1]) {
    const medVal = medHeaderMatch[1].trim();
    if (/not\s+specified|none|nil|n\/a/i.test(medVal)) {
      data.medicationsNotes = 'Not specified in document';
    }
  }

  // 3. Extract individual medications with separated fields
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip headers, facility metadata, and address lines
    if (/patient|complaint|advice|purpose|demo|clinical notes|date|doctor|hospital|clinic|uhid|age|gender|road|street|nagar|floor|building|lane|avenue|marg|phone|email|contact/i.test(trimmed)) {
      continue;
    }

    const hasMedIndicator =
      /\b(?:tab|tablet|cap|capsule|syrup|suspension|inj|injection|gel|drops?|ointment|cream|inhaler)\b/i.test(trimmed) ||
      /\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|iu|puffs?)\b/i.test(trimmed);

    if (hasMedIndicator) {
      // Dosage Form
      let dosageForm: string | undefined;
      if (/\b(?:tab|tablet)s?\b/i.test(trimmed)) dosageForm = 'Tablet';
      else if (/\b(?:cap|capsule)s?\b/i.test(trimmed)) dosageForm = 'Capsule';
      else if (/\b(?:syp|syrup|suspension)\b/i.test(trimmed)) dosageForm = 'Syrup';
      else if (/\b(?:inj|injection)s?\b/i.test(trimmed)) dosageForm = 'Injection';
      else if (/\bdrops?\b/i.test(trimmed)) dosageForm = 'Drops';
      else if (/\b(?:ointment|cream|gel)\b/i.test(trimmed)) dosageForm = 'Ointment';
      else if (/\binhaler\b/i.test(trimmed)) dosageForm = 'Inhaler';

      // Dosage
      const doseMatch = trimmed.match(/\b(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|iu|puffs?|drops?))\b/i);
      const dosage = doseMatch && doseMatch[1] ? doseMatch[1].trim() : undefined;

      // Frequency
      const freqCodeMatch = trimmed.match(/\b(1-0-1|0-1-0|1-1-1|1-0-0|0-0-1|0-0-2|2-0-2|1-1-0|0-1-1|od|bd|bid|tds|tid|qid|daily|once\s+daily|twice\s+daily|thrice\s+daily|weekly|prn|sos|hs)\b/i);
      let frequency = freqCodeMatch && freqCodeMatch[1] ? freqCodeMatch[1].toUpperCase() : undefined;
      if (frequency === '1-0-1') frequency = '1-0-1 (Twice daily)';
      else if (frequency === '1-1-1') frequency = '1-1-1 (Thrice daily)';
      else if (frequency === '1-0-0') frequency = '1-0-0 (Morning once)';
      else if (frequency === '0-0-1') frequency = '0-0-1 (Bedtime once)';
      else if (frequency === 'OD') frequency = 'OD (Once daily)';
      else if (frequency === 'BD' || frequency === 'BID') frequency = 'BD (Twice daily)';
      else if (frequency === 'TDS' || frequency === 'TID') frequency = 'TDS (Thrice daily)';
      else if (frequency === 'SOS' || frequency === 'PRN') frequency = 'SOS (As needed)';
      else if (frequency === 'HS') frequency = 'HS (At bedtime)';

      // Timing breakdown
      let timing: string | undefined;
      if (/1-0-1|twice\s+daily|bd|bid/i.test(trimmed)) timing = 'Morning & Night';
      else if (/1-1-1|thrice\s+daily|tds|tid/i.test(trimmed)) timing = 'Morning, Noon & Night';
      else if (/1-0-0|morning|breakfast/i.test(trimmed)) timing = 'Morning';
      else if (/0-0-1|\bhs\b|bedtime|night|dinner/i.test(trimmed)) timing = 'Night / Bedtime';
      else if (/0-1-0|noon|afternoon|lunch/i.test(trimmed)) timing = 'Noon';
      else if (/\bsos\b|\bprn\b|as\s+needed/i.test(trimmed)) timing = 'As needed';
      else if (/\bod\b|once\s+daily/i.test(trimmed)) timing = 'Morning';

      // Food relation
      let foodRelation: string | undefined;
      if (/\b(?:before\s+(?:food|meals|breakfast)|empty\s+stomach)\b/i.test(trimmed)) {
        foodRelation = 'Before food';
      } else if (/\b(?:after\s+(?:food|meals|breakfast|dinner|lunch))\b/i.test(trimmed)) {
        foodRelation = 'After food';
      } else if (/\b(?:with\s+(?:food|meals))\b/i.test(trimmed)) {
        foodRelation = 'With food';
      }

      // Duration
      const durMatch = trimmed.match(/\b(?:for\s+)?(\d+\s*(?:days?|weeks?|months?))\b/i) ||
                       trimmed.match(/\bx\s*(\d+\s*(?:days?|weeks?|months?))\b/i);
      const duration = durMatch && durMatch[1] ? durMatch[1].trim() : undefined;

      // Instructions
      const instrMatch = trimmed.match(/\b(?:with\s+warm\s+water|do\s+not\s+crush|dissolve\s+in\s+water|apply\s+locally|rinse\s+mouth|shake\s+well)\b/i);
      let instructions = instrMatch && instrMatch[0] ? instrMatch[0].trim() : undefined;
      if (!instructions && foodRelation) {
        instructions = foodRelation;
      }

      // Clean Medicine Name
      let cleanName = trimmed
        .replace(/^[0-9.)\-*•]+\s*/, '')
        .replace(/\b(?:tab|tablet|cap|capsule|syrup|suspension|inj|injection|gel|drops?|ointment|cream|inhaler)\b\.?\s*/gi, '')
        .replace(/^[0-9.)\-*•\s]+/, '')
        .trim();

      if (doseMatch && doseMatch[1]) cleanName = cleanName.replace(doseMatch[1], '');
      if (freqCodeMatch && freqCodeMatch[1]) cleanName = cleanName.replace(freqCodeMatch[1], '');
      if (durMatch && durMatch[0]) cleanName = cleanName.replace(durMatch[0], '');
      if (foodRelation) cleanName = cleanName.replace(new RegExp(foodRelation, 'gi'), '');
      if (instructions) cleanName = cleanName.replace(new RegExp(instructions, 'gi'), '');

      cleanName = cleanName
        .replace(/\b(?:before|after|with)\s+(?:food|meals|breakfast|dinner|lunch|water)\b/gi, '')
        .replace(/\b(?:twice|once|thrice|daily|times|for|days?|weeks?|months?|x|at\s+bedtime|bedtime|morning|night|noon|evening|afternoon)\b/gi, '')
        .replace(/[-–—:()]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const finalName = cleanName.length > 1
        ? cleanName.slice(0, 45)
        : trimmed.replace(/^[0-9.)\-*•]+\s*/, '').slice(0, 40);

      data.medications.push({
        id: `med-${Date.now()}-${data.medications.length}`,
        name: finalName,
        dosage,
        dosageForm,
        form: dosageForm,
        frequency,
        timing,
        foodRelation,
        duration,
        instructions,
        verified: false,
      });
    }
  }

  if (data.medications.length === 0 && !data.medicationsNotes) {
    data.medicationsNotes = 'No specific medications detected in document';
  }

  // 4. Grounded Doctor Questions
  if (data.medications.length > 0) {
    data.doctorQuestions = [
      'What is the expected timeframe for symptom improvement with this treatment plan?',
      'Are there common side effects or adverse warning signs I should watch out for with my prescribed medication(s)?',
      'Should any of these medications be taken with specific foods, and what should I do if I accidentally miss a scheduled dose?',
      'When should I schedule my next clinical review or follow-up consultation?',
    ];
  } else {
    data.doctorQuestions = [
      'What is the clinical cause or underlying basis for the symptoms observed during this consultation?',
      'Are there diagnostic laboratory tests or imaging evaluations recommended for further clarity?',
      'What lifestyle modifications, dietary changes, or symptom monitoring steps should I adopt?',
      'Under what circumstances or red-flag symptoms should I seek immediate in-person medical care?',
    ];
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
