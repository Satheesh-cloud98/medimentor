import type { DocumentType, DocumentClassificationResult } from '../types/document';

interface CategoryRule {
  type: DocumentType;
  label: string;
  patterns: RegExp[];
  negativePatterns?: RegExp[];
  strongWeightKeywords: RegExp[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    type: 'eye_prescription',
    label: 'Eye Prescription',
    patterns: [
      /\b(od|o\.d\.)\b/i,
      /\b(os|o\.s\.)\b/i,
      /\b(ou|o\.u\.)\b/i,
      /\b(sph|sphere)\b/i,
      /\b(cyl|cylinder)\b/i,
      /\baxis\b/i,
      /\badd\b/i,
      /\b(pd|ipd|pupillary distance)\b/i,
      /\bvisual acuity\b/i,
      /\brefraction\b/i,
      /\bophthalmolog\w*\b/i,
      /\boptometr\w*\b/i,
      /\bspectacle(s)?\b/i,
      /\bdiopter(s)?\b/i,
      /\bdist(ance)?\b.*\bnear\b/i,
    ],
    strongWeightKeywords: [
      /\b(od|o\.d\.)\b.*\b(os|o\.s\.)\b/i,
      /\b(sph|sphere)\b.*\b(cyl|cylinder)\b/i,
      /\bpupillary distance\b/i,
    ],
  },
  {
    type: 'urine_test',
    label: 'Urine Test / Urinalysis',
    patterns: [
      /\burine routine\b/i,
      /\burinalysis\b/i,
      /\burine analysis\b/i,
      /\bpus cells\b/i,
      /\bepithelial cells\b/i,
      /\burobilinogen\b/i,
      /\burine protein\b/i,
      /\bspecific gravity\b/i,
      /\burine glucose\b/i,
      /\bketones\b/i,
      /\burine microscopy\b/i,
      /\bhyaline casts\b/i,
      /\bbile salts\b/i,
    ],
    strongWeightKeywords: [/\burinalysis\b/i, /\burine routine\b/i, /\bpus cells\b/i],
  },
  {
    type: 'lab_report',
    label: 'Blood & Laboratory Report',
    patterns: [
      /\bhemoglobin\b/i,
      /\bleukocyte(s)?\b/i,
      /\bplatelet(s)?\b/i,
      /\bcholesterol\b/i,
      /\btriglyceride(s)?\b/i,
      /\bhba1c\b/i,
      /\bcreatinine\b/i,
      /\bbilirubin\b/i,
      /\bserum\b/i,
      /\bfasting blood glucose\b/i,
      /\breference range\b/i,
      /\bbiological reference\b/i,
      /\bcomplete blood count\b/i,
      /\bcbc\b/i,
      /\blipid profile\b/i,
      /\bliver function test\b/i,
      /\blft\b/i,
      /\bkft\b/i,
      /\brenal function\b/i,
      /\bhematology\b/i,
      /\bserology\b/i,
      /\begfr\b/i,
    ],
    strongWeightKeywords: [
      /\breference range\b/i,
      /\bcomplete blood count\b/i,
      /\blipid profile\b/i,
      /\bhemoglobin\b/i,
    ],
  },
  {
    type: 'ecg_report',
    label: 'ECG / EKG Report',
    patterns: [
      /\belectrocardiogram\b/i,
      /\b(ecg|ekg)\b/i,
      /\bsinus rhythm\b/i,
      /\bventricular rate\b/i,
      /\batrial rate\b/i,
      /\bpr interval\b/i,
      /\bqrs (duration|interval|axis)\b/i,
      /\bqt\/?qtc\b/i,
      /\b(st-t|st segment)\b/i,
      /\bt wave\b/i,
      /\blead (i|ii|iii|avf|avl|avr|v1|v2|v3|v4|v5|v6)\b/i,
    ],
    strongWeightKeywords: [/\belectrocardiogram\b/i, /\bsinus rhythm\b/i, /\bqrs\b/i],
  },
  {
    type: 'radiology_report',
    label: 'Radiology Report (X-Ray, CT, MRI, USG)',
    patterns: [
      /\bradiology\b/i,
      /\bx-ray\b/i,
      /\bchest x-ray\b/i,
      /\bct scan\b/i,
      /\bcomputed tomography\b/i,
      /\bmri\b/i,
      /\bmagnetic resonance\b/i,
      /\bultrasound\b/i,
      /\bsonography\b/i,
      /\bimpression:\b/i,
      /\bfindings:\b/i,
      /\btechnique:\b/i,
      /\bopacit(y|ies)\b/i,
      /\bconsolidation\b/i,
      /\blung fields\b/i,
      /\bno acute (bony|cardiopulmonary)\b/i,
    ],
    strongWeightKeywords: [/\bcomputed tomography\b/i, /\bradiology\b/i, /\bchest x-ray\b/i],
  },
  {
    type: 'discharge_summary',
    label: 'Discharge Summary',
    patterns: [
      /\bdischarge summary\b/i,
      /\b(?:inpatient|hospital)?\s*discharge summary\b/i,
      /\b(?:admission date|date of admission)\b/i,
      /\b(?:discharge date|date of discharge)\b/i,
      /\bhospital course\b/i,
      /\b(?:admission diagnosis|admitted for)\b/i,
      /\b(?:discharge diagnosis|diagnosis at discharge|primary diagnosis)\b/i,
      /\bcondition at discharge\b/i,
      /\b(?:discharge advice|discharge medications?)\b/i,
      /\boperative procedure\b/i,
    ],
    strongWeightKeywords: [
      /\bdischarge summary\b/i,
      /\b(?:discharge date|date of discharge)\b/i,
      /\b(?:discharge diagnosis|diagnosis at discharge)\b/i,
      /\bcondition at discharge\b/i,
    ],
  },
  {
    type: 'prescription',
    label: 'Medication Prescription',
    patterns: [
      /\b(prescription|prescriptions)\b/i,
      /\b(medical\s+prescription)\b/i,
      /\b(medication|medications|medicine|medicines|drug|drugs)\b/i,
      /\b(dosage|dose|dosing)\b/i,
      /\b(rx|℞)\b/i,
      /\b(tab|tabs|tablet|tablets)\b/i,
      /\b(cap|caps|capsule|capsules)\b/i,
      /\b(syrup|suspension|injection|inj|drops?|ointment|cream|inhaler)\b/i,
      /\b(mg|ml|mcg|gm?|iu)\b/i,
      /\b(od|bd|tds|qid|bid|tid|daily|weekly|prn|sos|hs|stat)\b/i,
      /\b(before|after|with)\s+(food|meals)\b/i,
      /\b(complaint|chief\s+complaint|clinical\s+notes|diagnosis|treatment|advice)\b/i,
      /\b(dispense|refill|refills|duration)\b/i,
      /\b(prescribed\s+by|prescribed|prescribing|physician|dr\.|doctor)\b/i,
      /\b(clinic|pharmacy|hospital)\b/i,
    ],
    strongWeightKeywords: [
      /\b(medical\s+)?prescription\b/i,
      /\b(rx|℞)\b/i,
      /\bmedication(s)?\b/i,
      /\b(tab|tablet|cap|capsule)s?\b/i,
      /\bprescribed\s+by\b/i,
    ],
  },
];

/**
 * Content-based medical document classification
 * IMPORTANT: Evaluates purely textual tokens from the document content; NEVER uses file name.
 */
export function classifyMedicalDocument(text: string): DocumentClassificationResult {
  const normalized = text.toLowerCase();
  const detectedScores: Record<DocumentType, { score: number; keywords: string[] }> = {
    eye_prescription: { score: 0, keywords: [] },
    urine_test: { score: 0, keywords: [] },
    lab_report: { score: 0, keywords: [] },
    ecg_report: { score: 0, keywords: [] },
    radiology_report: { score: 0, keywords: [] },
    discharge_summary: { score: 0, keywords: [] },
    prescription: { score: 0, keywords: [] },
    unsupported: { score: 0, keywords: [] },
  };

  // Score each medical category based on content patterns
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    const keywords: string[] = [];

    // Strong keywords get 3 points
    for (const kw of rule.strongWeightKeywords) {
      if (kw.test(normalized)) {
        score += 3;
        const match = normalized.match(kw);
        if (match && !keywords.includes(match[0])) {
          keywords.push(match[0]);
        }
      }
    }

    // Standard patterns get 1 point each
    for (const pat of rule.patterns) {
      if (pat.test(normalized)) {
        score += 1;
        const match = normalized.match(pat);
        if (match && !keywords.includes(match[0])) {
          keywords.push(match[0]);
        }
      }
    }

    detectedScores[rule.type] = { score, keywords };
  }

  // Eye prescription precedence bonus:
  // If OD and OS along with SPH or CYL or AXIS are found, it's unmistakably an eye prescription
  if (
    (/\b(od|o\.d\.)\b/i.test(normalized) || /\b(os|o\.s\.)\b/i.test(normalized)) &&
    (/\bsph\b/i.test(normalized) || /\bcyl\b/i.test(normalized) || /\baxis\b/i.test(normalized))
  ) {
    detectedScores.eye_prescription.score += 5;
  }

  // Medication prescription precedence rule:
  // Prescriptions frequently mention requested lab investigations in clinical notes (e.g. "Check HbA1c, Lipid Profile").
  // If a document has Rx / ℞ / Prescription headers along with medication dosage forms (Tab, Cap, mg, dosing schedule),
  // and lacks actual laboratory reference range tables (Biological Reference / Reference Range), it is decisively a Prescription.
  const hasRxHeader = /\b(rx|℞|medical\s+prescription|prescribed\s+by|prescription)\b/i.test(normalized);
  const hasMedicationDosing = /\b(tab|tablet|cap|capsule|syrup|dosage|dosing|bd|tds|qid|od|1-0-1|0-1-0|1-0-0|0-0-1|daily|sos)\b/i.test(normalized);
  const hasLabReferenceTable = /\b(reference\s+range|biological\s+reference|observed\s+value|test\s+method|specimen\s*type|sample\s+collected)\b/i.test(normalized);

  if (hasRxHeader && hasMedicationDosing && !hasLabReferenceTable) {
    detectedScores.prescription.score += 8;
  }

  // Sort categories by score descending
  const sorted = Object.entries(detectedScores)
    .filter(([type]) => type !== 'unsupported')
    .sort((a, b) => b[1].score - a[1].score) as [DocumentType, { score: number; keywords: string[] }][];

  const topCategory = sorted[0];
  const secondCategory = sorted[1];

  // If top score is negligible (< 2), document is unsupported or unidentifiable
  if (!topCategory || topCategory[1].score < 2) {
    return {
      type: 'unsupported',
      confidence: 10,
      isAmbiguous: true,
      detectedKeywords: [],
      reason:
        'The extracted text does not contain identifiable medical terminology or clinical formatting. Please confirm the document type or upload a valid medical report.',
    };
  }

  // Calculate confidence percentage
  const totalScore = sorted.reduce((sum, item) => sum + item[1].score, 0);
  const confidence = Math.min(
    98,
    Math.max(45, Math.round((topCategory[1].score / Math.max(1, totalScore)) * 100))
  );

  // Check if classification is ambiguous (close second competitor, low confidence, or mixed clinical evidence)
  const isAmbiguous =
    confidence < 75 &&
    Boolean(
      secondCategory &&
        secondCategory[1].score >= 2 &&
        (topCategory[1].score - secondCategory[1].score <= 5 ||
          secondCategory[1].score / Math.max(1, topCategory[1].score) >= 0.35)
    );

  const alternativeTypes: DocumentType[] =
    isAmbiguous && secondCategory && secondCategory[1].score >= 2 ? [secondCategory[0]] : [];

  return {
    type: topCategory[0],
    confidence,
    isAmbiguous,
    detectedKeywords: topCategory[1].keywords.slice(0, 6),
    alternativeTypes,
    reason: `Identified based on clinical terms (${topCategory[1].keywords.slice(0, 4).join(', ')}) in document content.`,
  };
}
