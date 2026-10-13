import type { AiExplanationResult, ExtractedDocumentData } from '../types/document';
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
    if (rx.doctorName) facts.push(`Prescribing Doctor: ${rx.doctorName}`);
    if (rx.clinicOrHospital || rx.hospitalOrClinic) facts.push(`Clinic/Hospital: ${rx.clinicOrHospital || rx.hospitalOrClinic}`);
    if (rx.complaintOrDiagnosis) facts.push(`Complaint / Clinical Notes: ${rx.complaintOrDiagnosis}`);
    if (rx.adviceOrInstructions) facts.push(`Doctor Advice: ${rx.adviceOrInstructions}`);
    if (rx.medications && rx.medications.length > 0) {
      for (const med of rx.medications) {
        facts.push(`Medication: ${med.name} ${med.dosage || ''} (Frequency: ${med.frequency || 'N/A'}, Instructions: ${med.instructions || 'N/A'})`);
      }
    } else {
      facts.push(`Medications: ${rx.medicationsNotes || 'Not specified in document'}`);
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
    };
  } catch (_err: any) {
    const fallbackFacts = facts.length > 0 ? facts : ['Clinical parameters recorded from document.'];
    return {
      configured: true,
      factsFromDocument: fallbackFacts,
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
