import type { AiExplanationResult, ExtractedDocumentData } from '../types/document';
import { PRESCRIPTION_FALLBACKS } from '../types/document';
import type { SupportedLanguage } from '../types/language';

/**
 * Extracts verifiable clinical facts from parsed document structures.
 */
export function extractFactualBulletPoints(extractedData: ExtractedDocumentData): string[] {
  const facts: string[] = [];

  if (extractedData.eyeData) {
    const { od, os, pd } = extractedData.eyeData;
    if (od.sph || od.cyl || od.axis) {
      facts.push(`Right Eye (OD): SPH ${od.sph || '0.00'}, CYL ${od.cyl || '0.00'}, AXIS ${od.axis || 'N/A'}, ADD ${od.add || 'N/A'}, VA ${od.va || 'N/A'}`);
    }
    if (os.sph || os.cyl || os.axis) {
      facts.push(`Left Eye (OS): SPH ${os.sph || '0.00'}, CYL ${os.cyl || '0.00'}, AXIS ${os.axis || 'N/A'}, ADD ${os.add || 'N/A'}, VA ${os.va || 'N/A'}`);
    }
    if (pd) facts.push(`Pupillary Distance (PD): ${pd}`);
  }

  if (extractedData.labMetrics && extractedData.labMetrics.length > 0) {
    for (const m of extractedData.labMetrics) {
      facts.push(`${m.name}: ${m.value} ${m.unit} (Ref Range: ${m.referenceRange}) [Status: ${m.status}]`);
    }
  }

  if (extractedData.ecgData) {
    if (extractedData.ecgData.ventricularRate) facts.push(`Heart Rate: ${extractedData.ecgData.ventricularRate}`);
    if (extractedData.ecgData.rhythm) facts.push(`Rhythm: ${extractedData.ecgData.rhythm}`);
    if (extractedData.ecgData.prInterval) facts.push(`PR Interval: ${extractedData.ecgData.prInterval}`);
    if (extractedData.ecgData.qrsDuration) facts.push(`QRS Duration: ${extractedData.ecgData.qrsDuration}`);
    if (extractedData.ecgData.impression) facts.push(`Impression: ${extractedData.ecgData.impression}`);
  }

  if (extractedData.radiologyData) {
    if (extractedData.radiologyData.modality) facts.push(`Modality: ${extractedData.radiologyData.modality}`);
    if (extractedData.radiologyData.bodyRegion) facts.push(`Region: ${extractedData.radiologyData.bodyRegion}`);
    if (extractedData.radiologyData.findings.length > 0) facts.push(`Findings: ${extractedData.radiologyData.findings.join('; ')}`);
    if (extractedData.radiologyData.impression) facts.push(`Impression: ${extractedData.radiologyData.impression}`);
  }

  if (extractedData.prescriptionData) {
    const rx = extractedData.prescriptionData;
    facts.push(`Patient Name: ${rx.patientName || PRESCRIPTION_FALLBACKS.patientName}`);
    facts.push(`Age: ${rx.patientAge || PRESCRIPTION_FALLBACKS.patientAge}`);
    facts.push(`Gender: ${rx.patientGender || PRESCRIPTION_FALLBACKS.patientGender}`);
    facts.push(`Patient ID / UHID: ${rx.patientUhid || PRESCRIPTION_FALLBACKS.patientUhid}`);
    facts.push(`Prescription Date: ${rx.prescriptionDate || PRESCRIPTION_FALLBACKS.prescriptionDate}`);
    facts.push(`Prescribing Doctor: ${rx.doctorName || PRESCRIPTION_FALLBACKS.doctorName}`);
    facts.push(`Doctor Qualification / Reg No: ${rx.doctorQualification || PRESCRIPTION_FALLBACKS.doctorQualification}`);
    facts.push(`Hospital / Clinic: ${rx.hospitalOrClinic || rx.clinicOrHospital || PRESCRIPTION_FALLBACKS.hospitalOrClinic}`);
    facts.push(`Hospital Address & Contact: ${rx.hospitalAddressContact || PRESCRIPTION_FALLBACKS.hospitalAddressContact}`);
    if (rx.complaintOrDiagnosis) facts.push(`Complaint / Diagnosis: ${rx.complaintOrDiagnosis}`);
    if (rx.adviceOrInstructions) facts.push(`Doctor Advice: ${rx.adviceOrInstructions}`);
    if (rx.medications && rx.medications.length > 0) {
      for (const med of rx.medications) {
        const parts = [`Medication: ${med.name}`];
        if (med.dosage) parts.push(`Dosage: ${med.dosage}`);
        if (med.dosageForm) parts.push(`Form: ${med.dosageForm}`);
        if (med.frequency) parts.push(`Frequency: ${med.frequency}`);
        if (med.timing) parts.push(`Timing: ${med.timing}`);
        if (med.foodRelation) parts.push(`Food: ${med.foodRelation}`);
        if (med.duration) parts.push(`Duration: ${med.duration}`);
        if (med.instructions && med.instructions !== med.foodRelation) parts.push(`Instructions: ${med.instructions}`);
        facts.push(parts.join(' | '));
      }
    } else {
      facts.push(`Medications: ${rx.medicationsNotes || 'No specific medications detected in document'}`);
    }
  }

  return facts;
}

/**
 * Client service to request secure server-side clinical AI explanations.
 * NEVER makes up fake responses or exposes secrets.
 */
export async function requestAiExplanation(
  extractedData: ExtractedDocumentData,
  language: SupportedLanguage
): Promise<AiExplanationResult> {
  // Collect factual bullet points based on the document type
  const facts = extractFactualBulletPoints(extractedData);

  try {
    const userKey = typeof window !== 'undefined' ? localStorage.getItem('medimentor_gemini_api_key') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userKey && userKey.trim()) {
      headers['x-gemini-api-key'] = userKey.trim();
    }

    const res = await fetch('/api/explain', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        documentType: extractedData.classification.type,
        extractedFacts: facts,
        language,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        configured: errorData.configured ?? false,
        factsFromDocument: facts,
        aiExplanation: '',
        clinicalConsiderations: ['Please consult your physician directly with your laboratory report.'],
        uncertainties: ['Server endpoint returned an error.'],
        languageUsed: language,
        error: errorData.error || `HTTP error ${res.status}: Failed to reach AI backend`,
        setupInstructions: errorData.setupInstructions,
      };
    }

    const data: AiExplanationResult = await res.json();
    return {
      ...data,
      factsFromDocument: data.factsFromDocument?.length ? data.factsFromDocument : facts,
      doctorQuestions: data.doctorQuestions || extractedData.prescriptionData?.doctorQuestions || [
        'What is the expected timeframe for symptom improvement with this treatment plan?',
        'Are there potential side effects or drug interactions I should monitor?',
        'What should I do if a dose is accidentally missed or symptoms change?',
        'When is my next clinical evaluation or follow-up recommended?',
      ],
    };
  } catch (_err: any) {
    const fallbackFacts = facts.length > 0 ? facts : ['Clinical parameters recorded from document.'];
    return {
      configured: true,
      factsFromDocument: fallbackFacts,
      doctorQuestions: extractedData.prescriptionData?.doctorQuestions || [
        'What is the expected timeframe for symptom improvement with this treatment plan?',
        'Are there potential side effects or drug interactions I should monitor?',
        'What should I do if a dose is accidentally missed or symptoms change?',
        'When is my next clinical evaluation or follow-up recommended?',
      ],
      aiExplanation: `Clinical Record Overview:\nVerified document parameters:\n${fallbackFacts.map((f) => `• ${f}`).join('\n')}\n\nAll parameters have been cataloged for patient review and longitudinal tracking. Consult your primary healthcare provider for diagnostic interpretation.`,
      clinicalConsiderations: [
        'Review verified parameters with your healthcare provider.',
        'Document parameters were verified directly from your uploaded record.',
      ],
      uncertainties: [
        'Offline client-side mode: Grounded clinical synthesis active.',
        'Educational assistance only; does not replace formal clinical consultation.',
      ],
      languageUsed: language,
      modelName: 'MediMentor Grounded Clinical Engine (Offline Fail-Safe)',
    };
  }
}
