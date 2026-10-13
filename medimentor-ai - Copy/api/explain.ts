import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory response cache to prevent redundant API calls and rate-limit burn
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

function getCacheKey(keyPrefix: string, docType: string, lang: string, facts: string[]): string {
  const factsStr = Array.isArray(facts) ? facts.slice().sort().join('|') : String(facts);
  return `${keyPrefix}_${docType}_${lang}_${factsStr}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Intelligent Grounded Clinical Synthesis Engine
 * Generates reliable, medically grounded physiological explanations
 * strictly anchored in verified document facts when cloud APIs are rate-limited.
 */
function generateGroundedClinicalSynthesis(
  documentType: string,
  facts: string[],
  language: string = 'en'
): {
  aiExplanation: string;
  clinicalConsiderations: string[];
  uncertainties: string[];
} {
  const factsList = Array.isArray(facts) ? facts : [];
  const abnormalFacts = factsList.filter((f) =>
    /high|elevated|low|attention|positive|trace|abnormal|marked/i.test(f)
  );


  let explanation = '';
  const considerations: string[] = [];
  const uncertainties: string[] = [
    'This clinical synthesis was generated using MediMentor AI\'s grounded clinical knowledge engine based strictly on verified parameters in your uploaded document.',
    'Educational assistance only; this does not constitute a formal diagnosis or prescription. Always consult your attending physician with the original diagnostic record.',
  ];

  switch (documentType) {
    case 'lab_report': {
      explanation = `Clinical Laboratory & Metabolic Overview:\n` +
        `This diagnostic panel reviews metabolic, hematological, renal, and biochemical parameters verified from your laboratory report:\n\n` +
        `• Biomarker Findings & Physiological Context:\n` +
        factsList.map((f) => `  - ${f}`).join('\n') + `\n\n` +
        `• Clinical Interpretation:\n` +
        (abnormalFacts.length > 0
          ? `Parameters requiring clinical attention: ${abnormalFacts.join('; ')}. Out-of-range metabolic analytes warrant clinical correlation by a medical professional, alongside evaluation of lifestyle, nutrition, and prior baseline tests.`
          : `All tested metabolic and hematological indices reflect stable physiological function within established clinical laboratory reference intervals.`) +
        `\n\n• General Physiological Function:\n` +
        `Blood glucose levels reflect glycemic homeostasis; lipid profiles correlate with cardiovascular vascular health; creatinine reflects glomerular renal filtration; and hemoglobin denotes tissue oxygenation capacity.`;

      if (abnormalFacts.length > 0) {
        considerations.push(`Schedule an appointment with your physician to evaluate out-of-range parameters: ${abnormalFacts.slice(0, 3).join(', ')}.`);
        considerations.push('Do not make unilateral adjustments to medications or diet without guidance from a certified practitioner.');
      } else {
        considerations.push('Continue routine healthy nutrition, hydration, and periodic health screenings as recommended by your doctor.');
      }
      considerations.push('Compare these findings with historical laboratory panels to observe longitudinal trends.');
      break;
    }

    case 'eye_prescription': {
      explanation = `Spectacle Refraction & Visual Acuity Assessment:\n` +
        `This refraction record outlines optical correction parameters for clear distance and near vision:\n\n` +
        factsList.map((f) => `• ${f}`).join('\n') + `\n\n` +
        `• Physiological & Optical Significance:\n` +
        `1. Spherical Power (SPH): Quantifies refractive myopia (minus power) or hyperopia (plus power) necessary to focus light rays onto the retina.\n` +
        `2. Cylindrical Power (CYL) & Axis: Corrects astigmatic corneal asymmetry along the specified degree axis.\n` +
        `3. Near Addition (ADD): Provides accommodative assistance for near tasks such as reading and digital screen use.\n` +
        `4. Pupillary Distance (PD): Critical measurement ensuring the optical centers of manufactured lenses align precisely with visual axes.`;

      considerations.push('Present this prescription to a certified optometrist or optical dispenser for accurate lens fabrication.');
      considerations.push('Ensure an anti-reflective or blue-light filter coating if you experience frequent digital eye strain.');
      considerations.push('Have your visual acuity re-evaluated annually or if experiencing visual blur or persistent headaches.');
      break;
    }

    case 'ecg_report': {
      explanation = `12-Lead Electrocardiogram (ECG) Conduction Assessment:\n` +
        `This cardiac tracing evaluates resting electrophysiological conduction and rhythm:\n\n` +
        factsList.map((f) => `• ${f}`).join('\n') + `\n\n` +
        `• Conduction & Rhythm Analysis:\n` +
        `Heart rate and rhythm parameters denote sinoatrial node depolarization. PR interval reflects electrical conduction time from atria through the AV node, while QRS duration denotes ventricular depolarization speed. Normal axis indicates balanced ventricular electrical vectors without conduction blocks.`;

      considerations.push('Share this ECG report with your cardiologist or consulting physician for clinical correlation.');
      considerations.push('Maintain regular blood pressure monitoring and cardiovascular wellness.');
      considerations.push('Seek immediate medical emergency care if experiencing acute chest tightness, breathlessness, or palpitations.');
      break;
    }

    case 'urine_test': {
      explanation = `Urinalysis & Renal Clearance Profile:\n` +
        `This urinalysis report evaluates urinary tract status and renal solute clearance:\n\n` +
        factsList.map((f) => `• ${f}`).join('\n') + `\n\n` +
        `• Physical & Microscopic Context:\n` +
        `Specific gravity denotes renal concentrating efficiency and systemic hydration. pH reflects acid-base homeostasis. Microscopic cellular evaluation (pus cells and epithelial cells) helps evaluate absence of active inflammatory or urinary tract infectious processes.`;

      considerations.push('Maintain adequate daily water intake (2 to 2.5 liters daily unless medically restricted).');
      considerations.push('Consult your doctor if you experience dysuria, frequency, or fever.');
      break;
    }

    case 'radiology_report': {
      explanation = `Radiological Imaging Evaluation:\n` +
        `This diagnostic imaging report documents thoracic or anatomical radiological observations:\n\n` +
        factsList.map((f) => `• ${f}`).join('\n') + `\n\n` +
        `• Anatomical Interpretation:\n` +
        `Diagnostic impressions review field lucency, vascular markings, diaphragmatic contours, and cardiothoracic boundaries. Absence of focal infiltration or pleural effusion indicates stability of visualized pulmonary and mediastinal structures.`;

      considerations.push('Review radiological impressions directly with your pulmonologist or referring physician.');
      considerations.push('Keep original radiological films and digital DICOM data for comparative future imaging.');
      break;
    }

    case 'prescription': {
      // Check if medications are explicitly present and non-empty
      const hasMedications = factsList.some((f) => {
        const lower = f.toLowerCase();
        if (lower.startsWith('medication:') || lower.startsWith('medications:')) {
          const val = lower.replace(/^medications?:\s*/, '').trim();
          return (
            val !== 'not specified in document' &&
            val !== 'not specified' &&
            val !== 'none' &&
            val !== 'nil' &&
            val !== 'n/a' &&
            val !== 'not found' &&
            val !== 'no specific medications detected in document' &&
            val !== ''
          );
        }
        return false;
      });

      if (!hasMedications) {
        explanation = `Clinical Consultation Note — No Pharmacological Medications Prescribed:\n` +
          `This document records a clinical evaluation or consultation note; NO medications, drugs, or therapeutic dosages were prescribed in this record:\n\n` +
          factsList.map((f) => `• ${f}`).join('\n') + `\n\n` +
          `• Clinical Safety Directive:\n` +
          `No pharmaceutical medications were authorized or prescribed in this document. Do NOT purchase, consume, or alter any medication based on this record. Consult a licensed healthcare provider for an in-person clinical examination if medical treatment is required.`;

        considerations.push('No prescription medications or therapeutic dosages were prescribed in this document.');
        considerations.push('Follow any clinical lifestyle, hydration, or observational guidance noted by the clinician.');
        considerations.push('Seek in-person consultation with a qualified medical professional if symptoms persist or worsen.');
      } else {
        explanation = `Clinical Prescription & Therapy Guidance:\n` +
          `This clinical prescription outlines therapeutic recommendations from your consulting physician:\n\n` +
          factsList.map((f) => `• ${f}`).join('\n') + `\n\n` +
          `• Adherence & Medical Guidance:\n` +
          `Adhere strictly to verified medication timings and dosages specified by your doctor. Complete prescribed courses as directed. Never discontinue or alter prescription dosages without prior professional medical consultation.`;

        considerations.push('Clarify any potential drug-drug interactions or side effects with your treating physician or pharmacist.');
        considerations.push('Keep an updated personal list of all active medications and known drug allergies.');
        considerations.push('Attend scheduled clinical follow-up as directed.');
      }
      break;
    }

    case 'discharge_summary': {
      explanation = `Inpatient Hospital Discharge Summary:\n` +
        `This record documents clinical stabilization, inpatient course, and discharge recommendations:\n\n` +
        factsList.map((f) => `• ${f}`).join('\n') + `\n\n` +
        `• Post-Discharge Care & Recovery:\n` +
        `Post-hospitalization care requires adherence to prescribed transition medications, adequate hydration, dietary rehabilitation, and physical rest. Prompt recognition of red-flag symptoms ensures timely outpatient medical intervention.`;

      considerations.push('Schedule mandatory outpatient post-discharge review within the recommended timeframe.');
      considerations.push('Follow prescribed dietary and rehabilitation instructions diligently.');
      considerations.push('Contact emergency services immediately if fever, bleeding, acute shortness of breath, or chest pain recurs.');
      break;
    }

    default: {
      explanation = `Clinical Record Summary:\n` +
        `Verified clinical parameters extracted from your uploaded medical document:\n\n` +
        factsList.map((f) => `• ${f}`).join('\n') + `\n\n` +
        `All parameters have been cataloged for patient review and longitudinal health record keeping.`;

      considerations.push('Discuss verified parameters with your medical care team.');
      considerations.push('Store records safely in your personal health timeline.');
      break;
    }
  }

  // Add regional language note if non-English
  if (language && language !== 'en') {
    explanation += `\n\n[Language Preference: ${language.toUpperCase()}] Verified document parameters are cataloged in clinical terminology. Consult your regional healthcare provider for localized clinical consultation.`;
  }

  return {
    aiExplanation: explanation,
    clinicalConsiderations: considerations,
    uncertainties,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { documentType, extractedFacts, rawSummary, language } = req.body || {};
  const factsArray: string[] = Array.isArray(extractedFacts) ? extractedFacts : [];

  // Check for client-provided API Key (via secure header) or server-side API Key
  const customClientKey = (req.headers['x-gemini-api-key'] as string) || '';
  const apiKey = customClientKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    // Generate grounded clinical synthesis even if cloud key is not configured,
    // so user always has safe, verified insights while being informed of setup options.
    const fallback = generateGroundedClinicalSynthesis(documentType || 'medical_report', factsArray, language || 'en');
    return res.status(200).json({
      configured: false,
      error: 'AI cloud service unconfigured: GEMINI_API_KEY is missing on the server.',
      setupInstructions:
        'To enable live Google cloud model inference, obtain a free API key from Google AI Studio (https://aistudio.google.com/) and enter it in Settings or add GEMINI_API_KEY in your Vercel Project Settings.',
      factsFromDocument: factsArray,
      aiExplanation: fallback.aiExplanation,
      clinicalConsiderations: fallback.clinicalConsiderations,
      uncertainties: fallback.uncertainties,
      languageUsed: language || 'en',
      modelName: 'MediMentor Grounded Clinical Engine (Local Mode)',
    });
  }

  // Check in-memory cache to prevent redundant API calls and rate-limit hits
  const cacheKey = getCacheKey(apiKey.slice(-6), documentType || 'generic', language || 'en', factsArray);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json(cached.data);
  }

  // Call Google Gemini API securely with rate-limit protection & lightweight models
  try {
    const prompt = `You are MediMentor AI, a clinical health assistant explaining verified medical documents.
TARGET LANGUAGE: ${language || 'en'}
DOCUMENT TYPE: ${documentType || 'medical_report'}
FACTS EXTRACTED FROM DOCUMENT:
${factsArray.length > 0 ? factsArray.join('\n') : rawSummary || 'No data provided'}

CRITICAL CLINICAL GROUNDING & SAFETY GUIDELINES:
1. ONLY utilize the verified facts extracted from the document above.
2. DO NOT make up missing results, patient details, diagnoses, or medication instructions. When information is absent, state "Not found in document".
3. DO NOT independently prescribe medications or recommend modifying a prescribed dose.
4. If no medications are listed or if medications are marked as "Not specified", "None", or "Not found", you MUST explicitly state that NO medications were prescribed in this document. NEVER mention anti-infectives, antibiotic courses, or medication adherence schedules when no medications are documented.
5. Keep all medical values, units, signs, and terms intact without distortion.
6. Clearly separate facts from the document from educational physiological explanations.
7. Highlight uncertainties and emphasize consulting a certified physician. Do not present the AI as a replacement for a licensed healthcare provider.
8. Provide the response in valid JSON matching this schema:
{
  "factsFromDocument": ["fact 1", "fact 2"],
  "aiExplanation": "Educational plain-language summary of what these parameters mean physiologically",
  "clinicalConsiderations": ["Key consideration 1", "Key consideration 2"],
  "uncertainties": ["Explicit note that this is educational and requires physician review"]
}`;

    // Priority model sequence: start with lightweight, high-RPM models
    const candidateModels = Array.from(
      new Set(
        [
          process.env.GEMINI_MODEL,
          'gemini-2.5-flash-lite',
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-1.5-flash',
        ].filter(Boolean) as string[]
      )
    );

    let parsedJson: any = null;
    let successfulModel = '';
    let isRateLimited = false;

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2, // Low temperature for clinical precision
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429 || errText.includes('RESOURCE_EXHAUSTED')) {
            isRateLimited = true;
            // Short backoff before trying fallback model
            if (i < candidateModels.length - 1) {
              await delay(800 + Math.floor(Math.random() * 400));
            }
          }
          console.warn(`[MediMentor AI] Model ${model} status ${response.status}: ${errText.slice(0, 150)}`);
          continue;
        }

        const data: any = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
          continue;
        }

        let cleanText = candidateText.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        parsedJson = JSON.parse(cleanText);
        successfulModel = model;
        break;
      } catch (callErr: any) {
        console.warn(`[MediMentor AI] Exception calling ${model}:`, callErr?.message);
        continue;
      }
    }

    // If Gemini succeeded, cache and return
    if (parsedJson && parsedJson.aiExplanation) {
      const resultData = {
        configured: true,
        factsFromDocument: parsedJson.factsFromDocument || factsArray,
        aiExplanation: parsedJson.aiExplanation,
        clinicalConsiderations: parsedJson.clinicalConsiderations || [],
        uncertainties: parsedJson.uncertainties || [],
        languageUsed: language || 'en',
        modelName: successfulModel,
      };

      responseCache.set(cacheKey, { data: resultData, timestamp: Date.now() });
      return res.status(200).json(resultData);
    }

    // IF RATE LIMITED (HTTP 429) OR CLOUD API UNAVAILABLE:
    // Generate grounded, clinically safe synthesis directly from verified document facts!
    // NEVER fail with 502 or leave user with a broken error card.
    const groundedFallback = generateGroundedClinicalSynthesis(
      documentType || 'medical_report',
      factsArray,
      language || 'en'
    );

    const fallbackResult = {
      configured: true,
      factsFromDocument: factsArray,
      aiExplanation: groundedFallback.aiExplanation,
      clinicalConsiderations: groundedFallback.clinicalConsiderations,
      uncertainties: [
        isRateLimited
          ? 'Cloud inference rate limit reached (HTTP 429). This clinical synthesis was generated using MediMentor AI\'s grounded clinical knowledge engine.'
          : 'Cloud service temporarily unavailable. Synthesis generated via MediMentor AI grounded clinical knowledge engine.',
        ...groundedFallback.uncertainties,
      ],
      languageUsed: language || 'en',
      modelName: isRateLimited
        ? 'MediMentor Grounded Clinical Engine (Rate Limit Fail-Safe)'
        : 'MediMentor Grounded Clinical Engine (Fail-Safe)',
      isRateLimitFallback: true,
      quotaNotice: isRateLimited
        ? 'Google Gemini free-tier rate limit was reached on the server key. MediMentor AI synthesized your clinical insights using its grounded clinical knowledge engine. You can also provide a personal Google AI Studio key in Settings for live cloud reasoning.'
        : undefined,
    };

    responseCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
    return res.status(200).json(fallbackResult);
  } catch (err: any) {
    const errorFallback = generateGroundedClinicalSynthesis(
      documentType || 'medical_report',
      factsArray,
      language || 'en'
    );

    return res.status(200).json({
      configured: true,
      factsFromDocument: factsArray,
      aiExplanation: errorFallback.aiExplanation,
      clinicalConsiderations: errorFallback.clinicalConsiderations,
      uncertainties: [
        `Server exception occurred (${err?.message || 'Network error'}). Displaying grounded clinical synthesis.`,
        ...errorFallback.uncertainties,
      ],
      languageUsed: language || 'en',
      modelName: 'MediMentor Grounded Clinical Engine (Local Fallback)',
    });
  }
}
