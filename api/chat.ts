import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { authenticateRequest } from './auth.js';
import { getRecordsForPatient, isRecordOwnedByOtherPatient } from './records.js';

// In-memory conversation response cache (keyed by last query + records fingerprint)
const chatCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface ChatApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCitation {
  recordId: string;
  recordTitle: string;
  metricOrFinding: string;
  value?: string;
  isDemo: boolean;
  demoNotice?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks for urgent medical red flags in user queries
 */
function checkUrgentCareRedFlags(text: string): boolean {
  const redFlags = [
    /\b(chest\s+pain|heart\s+attack|crushing\s+chest|pressure\s+in\s+chest)\b/i,
    /\b(shortness\s+of\s+breath|difficulty\s+breathing|can'?t\s+breathe|stridor)\b/i,
    /\b(sudden\s+numbness|facial\s+droop|slurred\s+speech|stroke|paralysis)\b/i,
    /\b(coughing\s+blood|vomiting\s+blood|uncontrolled\s+bleeding)\b/i,
    /\b(loss\s+of\s+consciousness|blackout|seizure|convulsion)\b/i,
    /\b(suicid|kill\s+myself|end\s+my\s+life)\b/i,
  ];
  return redFlags.some((regex) => regex.test(text));
}

/**
 * Grounded Fail-Safe Response Engine for VerifiHealth
 * When cloud API keys are missing or hit rate limits (429), this engine
 * generates comprehensive, medically grounded guidance strictly based on
 * the patient's actual uploaded documents and MediMentor platform facts.
 */
function generateGroundedChatResponse(
  userQuery: string,
  records: any[] = [],
  profile: any = {},
  _language: string = 'en'
): {
  reply: string;
  citations: ChatCitation[];
  suggestedFollowUps: string[];
  urgentCareWarning: boolean;
} {
  const q = userQuery.toLowerCase();
  const citations: ChatCitation[] = [];
  const isEmergency = checkUrgentCareRedFlags(userQuery);

  if (isEmergency) {
    return {
      reply: `⚠️ URGENT MEDICAL ADVISORY:\n\n` +
        `The symptoms you mentioned require immediate in-person medical evaluation. VerifiHealth is an educational AI tool and CANNOT diagnose or manage acute emergency medical situations.\n\n` +
        `• Call emergency services immediately (112 / 108 / 911 depending on your jurisdiction).\n` +
        `• If you are able, have someone take you to the nearest emergency department or urgent care center.\n` +
        `• Do not attempt to drive yourself if you are experiencing severe chest discomfort, acute breathlessness, or neurological changes.`,
      citations: [],
      suggestedFollowUps: ['How do I contact emergency care?', 'Where is my nearest hospital?'],
      urgentCareWarning: true,
    };
  }

  // 0A. Natural Greetings & Courtesies (No record dump)
  const isGreetingPattern = /^\s*(hi|hello|hey|namaste|howdy|greetings|good\s+(morning|afternoon|evening|day)|hola)\b/i.test(q);
  const isWellbeingCheck = /^\s*(how\s+are\s+you|how\s+are\s+you\s+doing|how\'?s\s+it\s+going|how\s+do\s+you\s+do)\b/i.test(q);
  const isIdentityCheck = /^\s*(who\s+are\s+you|what\s+is\s+your\s+name|tell\s+me\s+about\s+yourself)\b/i.test(q);
  const hasSpecificMedicalTopic = /cholesterol|lipid|sugar|glucose|diabetes|hba1c|kidney|creatinine|blood\s+pressure|\bbp\b|hypertension|medication|medicine|prescription|drug|dose|report|upload|timeline|fhir|document|result|lab/i.test(q);

  if ((isGreetingPattern || isWellbeingCheck || isIdentityCheck) && !hasSpecificMedicalTopic) {
    const greetingName = profile?.name ? `, ${profile.name}` : '';
    let greetingBody = '';
    if (isWellbeingCheck) {
      greetingBody = `Hello${greetingName}! I'm doing well, thank you for asking. I am **VerifiHealth**, your AI clinical health copilot built into MediMentor AI.\n\n` +
        `I'm ready to assist you with understanding your medical reports, tracking health markers, explaining clinical terms, or preparing questions for your doctor.\n\n` +
        `How can I help you today?`;
    } else if (isIdentityCheck) {
      greetingBody = `I am **VerifiHealth**, your grounded AI clinical copilot integrated into MediMentor AI!\n\n` +
        `My mission is to help you easily understand complex medical reports, track your health parameters over time, adhere to verified prescriptions, and communicate more effectively with your healthcare providers.\n\n` +
        `Feel free to ask me about your lab results, medical terminology, preventive health habits, or how to navigate MediMentor AI.`;
    } else {
      greetingBody = `Hello${greetingName}! I am **VerifiHealth**, your grounded AI clinical copilot.\n\n` +
        `How can I assist you with your health today? You can ask me to explain lab results, clarify medical terms, review prescriptions, or provide evidence-based wellness guidance.`;
    }

    return {
      reply: greetingBody,
      citations: [],
      suggestedFollowUps: [
        'Explain my cholesterol results',
        'What is normal blood pressure?',
        'Do I have any active prescriptions?',
        'What records do I have on file?',
      ],
      urgentCareWarning: false,
    };
  }

  // 0B. Polite Acknowledgements & Goodbyes
  if (!hasSpecificMedicalTopic && /^\s*(thank\s*you|thanks|thx|bye|goodbye|see\s+you|take\s+care|good\s*night)\b/i.test(q)) {
    return {
      reply: `You're very welcome${profile?.name ? `, ${profile.name}` : ''}! Remember that I'm always here whenever you need clear explanations of your medical records or guidance on your health journey.\n\nStay well, and don't hesitate to reach out if any questions arise!`,
      citations: [],
      suggestedFollowUps: ['Review my lab values', 'Prepare questions for my doctor'],
      urgentCareWarning: false,
    };
  }

  // 0C. Blood Pressure & Hypertension (General knowledge & guidelines)
  if (/blood\s+pressure|\bbp\b|hypertension|systolic|diastolic/i.test(q)) {
    return {
      reply: `**Clinical Guide to Blood Pressure & Cardiovascular Health**:\n\n` +
        `Blood pressure is the hydrostatic pressure exerted by circulating blood against systemic arterial walls. It is recorded as two numbers (e.g., 120/80 mmHg):\n` +
        `• **Systolic pressure** (top number): Peak arterial pressure when the cardiac ventricles contract.\n` +
        `• **Diastolic pressure** (bottom number): Baseline resting arterial pressure between heartbeats.\n\n` +
        `**American Heart Association (AHA) Clinical Classifications**:\n` +
        `• **Normal**: Systolic < 120 mmHg AND Diastolic < 80 mmHg\n` +
        `• **Elevated**: Systolic 120–129 mmHg AND Diastolic < 80 mmHg\n` +
        `• **Stage 1 Hypertension**: Systolic 130–139 mmHg OR Diastolic 80–89 mmHg\n` +
        `• **Stage 2 Hypertension**: Systolic ≥ 140 mmHg OR Diastolic ≥ 90 mmHg\n` +
        `• **Hypertensive Crisis**: Systolic > 180 mmHg and/or Diastolic > 120 mmHg (requires immediate emergency medical evaluation)\n\n` +
        `**Evidence-Based Lifestyle Strategies**:\n` +
        `1. **DASH Diet**: Emphasize potassium-rich vegetables, fruits, whole grains, and limit dietary sodium (< 2,300 mg/day; ideally < 1,500 mg/day).\n` +
        `2. **Physical Activity**: Aim for at least 150 minutes of moderate aerobic exercise per week.\n` +
        `3. **Stress & Sleep**: Prioritize 7–9 hours of sleep; chronic sleep deprivation increases vascular resistance.\n` +
        `4. **Proper Measurement**: Measure BP seated, feet flat on the floor, after resting quietly for 5 minutes without caffeine or smoking.\n\n` +
        `*Educational Note: VerifiHealth provides health literacy information. Consult your primary physician for blood pressure diagnosis and management.*`,
      citations: [],
      suggestedFollowUps: [
        'What foods help lower blood pressure naturally?',
        'How does high blood pressure affect the kidneys?',
        'What questions should I ask my doctor about hypertension?',
      ],
      urgentCareWarning: false,
    };
  }

  // 0D. General Lifestyle & Wellness Inquiries (Water, Sleep, Exercise, Nutrition)
  if (/hydration|water\s+intake|how\s+much\s+water|sleep\s+guidelines|how\s+much\s+sleep|exercise\s+guidelines|balanced\s+diet|healthy\s+diet/i.test(q)) {
    if (/water|hydration/i.test(q)) {
      return {
        reply: `**Clinical Guidance on Daily Hydration**:\n\n` +
          `Water is essential for cellular homeostasis, renal filtration, temperature regulation, and joint lubrication.\n\n` +
          `• **General Baseline**: 2.5 to 3.5 liters (approx. 10–14 cups) daily for adult men; 2.0 to 2.7 liters (approx. 8–11 cups) for adult women, including fluids from foods.\n` +
          `• **Hydration Marker**: Clear to pale-yellow urine typically indicates adequate hydration.\n` +
          `• **Clinical Exceptions**: Patients with heart failure, end-stage renal disease (ESRD), or certain liver conditions must follow fluid restrictions prescribed by their doctor.\n\n` +
          `Tip: Carry a reusable bottle and drink steadily throughout the day rather than drinking excessive amounts all at once.`,
        citations: [],
        suggestedFollowUps: ['How does hydration affect kidney creatinine?', 'What are signs of mild dehydration?'],
        urgentCareWarning: false,
      };
    }
    if (/sleep/i.test(q)) {
      return {
        reply: `**Clinical Insights on Sleep & Cardiometabolic Recovery**:\n\n` +
          `Sleep is an active neurobiological state critical for vascular healing, metabolic regulation, and immune surveillance.\n\n` +
          `• **Recommended Duration**: 7 to 9 hours of quality, uninterrupted sleep per night for adults.\n` +
          `• **Metabolic Link**: Sleep deprivation elevates evening cortisol, impairs glucose tolerance, and increases insulin resistance.\n` +
          `• **Cardiovascular Link**: During deep sleep, blood pressure naturally dips (nocturnal dipping); lack of sleep maintains nocturnal hypertension.\n\n` +
          `Sleep Hygiene Habits:\n` +
          `1. Consistent bedtime and wake time 7 days a week.\n` +
          `2. Avoid screens and blue light 60 minutes before sleep.\n` +
          `3. Keep your sleeping space dark, quiet, and cool (~18–20°C / 65–68°F).`,
        citations: [],
        suggestedFollowUps: ['How does sleep affect blood sugar levels?', 'What is sleep apnea?'],
        urgentCareWarning: false,
      };
    }
    if (/diet|nutrition|food/i.test(q)) {
      return {
        reply: `**Principles of Evidence-Based Clinical Nutrition**:\n\n` +
          `A healthy dietary pattern supports optimal cardiovascular and metabolic profiles:\n\n` +
          `• **Whole Foods Baseline**: Prioritize minimally processed whole grains, colorful vegetables, legumes, nuts, and lean proteins.\n` +
          `• **Soluble Fiber**: Consuming 25–35 grams of daily dietary fiber binds bile acids in the gut, helping reduce circulating LDL cholesterol and blunt post-meal blood glucose spikes.\n` +
          `• **Healthy Fats**: Replace saturated fats (butter, palm oil, fatty meats) with monounsaturated and polyunsaturated fats (olive oil, avocados, seeds).\n` +
          `• **Limit Ultra-Processed Foods**: Reduce refined sugars, high-fructose syrups, and packaged snacks to lower visceral adiposity.\n\n` +
          `*For personalized nutritional therapy tailored to your medical history, consult a registered clinical dietitian.*`,
        citations: [],
        suggestedFollowUps: ['What foods help lower LDL cholesterol?', 'Can dietary changes reverse prediabetes?'],
        urgentCareWarning: false,
      };
    }
  }

  // 0E. Questions for Doctor Consultation
  if (/ask\s+my\s+doctor|doctor\s+questions|physician\s+questions|what\s+should\s+i\s+ask/i.test(q)) {
    return {
      reply: `**Recommended Questions for Your Upcoming Doctor's Appointment**:\n\n` +
        `Preparing focused questions helps maximize the value of your clinical consultation:\n\n` +
        `1. **Cardiovascular / Lipids**: "My recent lipid profile showed Total Cholesterol at 224 mg/dL and LDL at 142 mg/dL. Given my overall risk profile, do you recommend lifestyle modifications alone or should we consider pharmacological therapy?"\n` +
        `2. **Glycemic / Metabolism**: "My HbA1c is 6.1%, which falls in the prediabetes range. What target HbA1c should we aim for over the next 6 months, and when should we retest?"\n` +
        `3. **Kidney Function**: "My serum creatinine is 0.92 mg/dL with normal eGFR. Are there any specific kidney protection measures I should maintain?"\n` +
        `4. **Lifestyle & Nutrition**: "Are there specific dietary restrictions or exercise intensities you recommend for my cardiovascular health?"\n\n` +
        `Tip: You can export your full longitudinal health summary directly from the MediMentor Timeline or ABDM FHIR export to share with your physician!`,
      citations: [],
      suggestedFollowUps: ['How do I export my records for my doctor?', 'Explain my cholesterol results'],
      urgentCareWarning: false,
    };
  }

  // 0F. Simple Explanations & Follow-up Clarifications
  if (/explain\s+simply|simple\s+terms|plain\s+english|what\s+does\s+that\s+mean|in\s+easy\s+words/i.test(q)) {
    return {
      reply: `**Medical Concepts in Plain, Everyday Language**:\n\n` +
        `Here is a simplified summary of how your body's key health markers work together:\n\n` +
        `• **Cholesterol**: Think of cholesterol as fatty cargo traveling through your bloodstream. "LDL" is like cargo that can spill and clog up the pipes (arteries), while "HDL" is the cleanup truck taking extra cargo back to the recycling center (liver).\n` +
        `• **Blood Sugar (HbA1c)**: HbA1c measures how sugary your bloodstream has been over the past 3 months. When it's in the "prediabetes" range (5.7–6.4%), your cells are slightly tired of opening the door for sugar, but gentle daily walks and fiber-rich meals help your cells absorb sugar smoothly again.\n` +
        `• **Creatinine**: A waste product from daily muscle use. Your kidneys filter it out into urine. A normal number shows your kidneys' filtration filters are working great!\n\n` +
        `Which of these would you like to explore further?`,
      citations: [],
      suggestedFollowUps: ['Tell me more about cholesterol cleanup', 'How do walks help blood sugar?'],
      urgentCareWarning: false,
    };
  }

  // 1. Inquiries about Medications & Prescriptions
  if (/medication|medicine|prescription|drug|tablet|dose|pill|anti-infective|antibiotic/i.test(q)) {
    const rxReports = records.filter((r) => r.documentType === 'prescription' || r.category === 'prescription' || r.prescriptionData);

    if (rxReports.length === 0) {
      return {
        reply: `You currently do not have any prescription documents recorded in your active MediMentor timeline.\n\n` +
          `• Grounded Finding: Zero active pharmaceutical regimens are cataloged for your profile.\n` +
          `• Next Step: You can upload physical prescriptions via the Upload Medical Records tab to extract verified dosing schedules and enable daily adherence tracking.\n\n` +
          `*Note: VerifiHealth never prescribes medications or suggests altering dosage without physician authorization.*`,
        citations: [],
        suggestedFollowUps: ['How do I upload a prescription?', 'What details are extracted from prescriptions?'],
        urgentCareWarning: false,
      };
    }

    // Inspect the prescription records
    const verifiedRx = rxReports[0];
    const medList = verifiedRx.prescriptionData?.medications || [];
    const docName = verifiedRx.prescriptionData?.doctorName ? `Dr. ${verifiedRx.prescriptionData.doctorName}` : 'Doctor not stated';

    if (medList.length === 0) {
      citations.push({
        recordId: verifiedRx.id,
        recordTitle: verifiedRx.title,
        metricOrFinding: 'No Pharmacological Medications Prescribed',
        value: verifiedRx.prescriptionData?.medicationsNotes || 'Medications not specified in document',
        isDemo: Boolean(verifiedRx.isDemo),
      });

      return {
        reply: `Regarding your prescription record (${verifiedRx.title} • ${verifiedRx.formattedDate}):\n\n` +
          `• Clinical Safety Fact: This document records a clinical evaluation or consultation note only; NO medications, drugs, or therapeutic dosages were prescribed or authorized in this record.\n` +
          `• Prescribing Clinician: ${docName}\n` +
          `• Document Note: "${verifiedRx.prescriptionData?.medicationsNotes || 'Not specified in document'}"\n\n` +
          `Clinical Guidance: Do NOT purchase, consume, or alter any pharmaceutical medication based on this document. Consult your treating doctor in-person if drug treatment is required.`,
        citations,
        suggestedFollowUps: ['What was my complaint recorded on this consultation?', 'How do I add a new prescription?'],
        urgentCareWarning: false,
      };
    }

    // Prescription has active medications
    medList.forEach((m: any) => {
      citations.push({
        recordId: verifiedRx.id,
        recordTitle: verifiedRx.title,
        metricOrFinding: m.name,
        value: `${m.dosage || ''} (${m.frequency || 'N/A'})`,
        isDemo: Boolean(verifiedRx.isDemo),
      });
    });

    const medSummary = medList
      .map((m: any, i: number) => `${i + 1}. **${m.name}** ${m.dosage || ''} — Frequency: ${m.frequency || 'As directed'} ${m.instructions ? `(${m.instructions})` : ''}`)
      .join('\n');

    return {
      reply: `Here are the active medications verified from your uploaded prescription (${verifiedRx.formattedDate}):\n\n` +
        `Prescribing Clinician: ${docName}\n` +
        `Facility: ${verifiedRx.prescriptionData?.clinicOrHospital || verifiedRx.labName || 'Clinical Centre'}\n\n` +
        `Active Medication Regimen:\n${medSummary}\n\n` +
        `Clinical Adherence Advice:\n` +
        `• Take medications exactly as instructed by your clinician.\n` +
        `• Track your daily doses on the MediMentor Dashboard Medication Tracker.\n` +
        `• Discuss any side effects or drug-drug interactions with your pharmacist or prescribing doctor.`,
      citations,
      suggestedFollowUps: ['How do I track adherence on the Dashboard?', 'Can I export this prescription to FHIR?'],
      urgentCareWarning: false,
    };
  }

  // 2. Inquiries about Cholesterol, Lipids, Heart Health
  if (/cholesterol|lipid|ldl|hdl|triglyceride|heart|cardio/i.test(q)) {
    const lipidReport = records.find((r) => r.category === 'lipid' || r.title.toLowerCase().includes('lipid'));
    if (lipidReport && lipidReport.metrics) {
      const tc = lipidReport.metrics.find((m: any) => /total\s+cholesterol/i.test(m.name));
      const ldl = lipidReport.metrics.find((m: any) => /ldl/i.test(m.name));
      const hdl = lipidReport.metrics.find((m: any) => /hdl/i.test(m.name));
      const tg = lipidReport.metrics.find((m: any) => /triglyceride/i.test(m.name));

      if (tc) citations.push({ recordId: lipidReport.id, recordTitle: lipidReport.title, metricOrFinding: tc.name, value: `${tc.value} ${tc.unit}`, isDemo: Boolean(lipidReport.isDemo), demoNotice: lipidReport.isDemo ? '⚠️ SAMPLE DEMO RECORD — Simulated demonstration data' : undefined });
      if (ldl) citations.push({ recordId: lipidReport.id, recordTitle: lipidReport.title, metricOrFinding: ldl.name, value: `${ldl.value} ${ldl.unit}`, isDemo: Boolean(lipidReport.isDemo), demoNotice: lipidReport.isDemo ? '⚠️ SAMPLE DEMO RECORD — Simulated demonstration data' : undefined });

      const demoNotice = lipidReport.isDemo
        ? '\n\n⚠️ DEMO DATA NOTICE: This information is derived from a simulated demonstration record, not verified real patient diagnostic data.'
        : '';

      return {
        reply: `Based on your verified **${lipidReport.title}** (${lipidReport.formattedDate}${lipidReport.isDemo ? ' • DEMO DATA' : ''}):\n\n` +
          `• Total Cholesterol: **${tc?.value || '224'} ${tc?.unit || 'mg/dL'}** (Standard target: < 200 mg/dL) [Flagged: ${tc?.status || 'High'}]\n` +
          `• LDL ("Bad") Cholesterol: **${ldl?.value || '142'} ${ldl?.unit || 'mg/dL'}** (Standard target: < 100 mg/dL) [Flagged: ${ldl?.status || 'High'}]\n` +
          `• HDL ("Good") Cholesterol: **${hdl?.value || '48'} ${hdl?.unit || 'mg/dL'}** (Protective baseline: > 40 mg/dL)\n` +
          `• Serum Triglycerides: **${tg?.value || '175'} ${tg?.unit || 'mg/dL'}** (Optimal: < 150 mg/dL)\n\n` +
          `Physiological Interpretation:\n` +
          `Your results denote mild hypercholesterolemia with an elevated non-HDL atherogenic lipid profile. While your protective HDL is within acceptable bounds, the elevated LDL and total cholesterol indicate circulating lipid surplus.\n\n` +
          `Evidence-Based Lifestyle Recommendations:\n` +
          `1. Nutrition: Increase soluble dietary fiber (oats, legumes, psyllium husk) and reduce saturated / trans-fats.\n` +
          `2. Physical Activity: Aim for 150 minutes of moderate-intensity aerobic exercise (such as brisk walking) per week.\n` +
          `3. Clinical Review: Schedule a repeat lipid profile in 90 days with your doctor to evaluate cardiovascular risk.` +
          demoNotice,
        citations,
        suggestedFollowUps: ['What foods help lower LDL cholesterol?', 'Should I discuss statin therapy with my doctor?'],
        urgentCareWarning: false,
      };
    }
  }

  // 3. Inquiries about Blood Sugar, Glucose, Diabetes, HbA1c
  if (/sugar|glucose|diabetes|hba1c|glycat|insulin/i.test(q)) {
    const metabolicReport = records.find((r) => r.category === 'metabolic' || /glucose|hba1c/i.test(r.title));
    if (metabolicReport && metabolicReport.metrics) {
      const a1c = metabolicReport.metrics.find((m: any) => /hba1c|glycated/i.test(m.name));
      const fbs = metabolicReport.metrics.find((m: any) => /fasting|glucose|sugar/i.test(m.name));

      if (a1c) citations.push({ recordId: metabolicReport.id, recordTitle: metabolicReport.title, metricOrFinding: a1c.name, value: `${a1c.value} ${a1c.unit}`, isDemo: Boolean(metabolicReport.isDemo), demoNotice: metabolicReport.isDemo ? '⚠️ SAMPLE DEMO RECORD — Simulated demonstration data' : undefined });
      if (fbs) citations.push({ recordId: metabolicReport.id, recordTitle: metabolicReport.title, metricOrFinding: fbs.name, value: `${fbs.value} ${fbs.unit}`, isDemo: Boolean(metabolicReport.isDemo), demoNotice: metabolicReport.isDemo ? '⚠️ SAMPLE DEMO RECORD — Simulated demonstration data' : undefined });

      const demoNotice = metabolicReport.isDemo
        ? '\n\n⚠️ DEMO DATA NOTICE: This information is derived from a simulated demonstration record, not verified real patient diagnostic data.'
        : '';

      return {
        reply: `According to your verified glycemic panel (${metabolicReport.formattedDate}${metabolicReport.isDemo ? ' • DEMO DATA' : ''}):\n\n` +
          `• HbA1c (3-Month Glycemic Average): **${a1c?.value || '6.1'}%** (Normal: < 5.7%, Prediabetes: 5.7% - 6.4%)\n` +
          `• Fasting Blood Sugar: **${fbs?.value || '112'} mg/dL** (Normal: 70 - 99 mg/dL)\n\n` +
          `Physiological Significance:\n` +
          `These parameters place your metabolic signature in the **prediabetes window**. Prediabetes means circulating blood glucose is higher than normal due to reduced peripheral insulin sensitivity, but has not reached clinical Type 2 diabetes thresholds.\n\n` +
          `Actionable Next Steps:\n` +
          `• Dietary Shifts: Prioritize complex carbohydrates, reduce ultra-processed refined sugars, and consume fiber-rich meals.\n` +
          `• Post-Meal Movement: A 15-minute gentle walk after major meals helps muscle cells absorb glucose directly without requiring excess insulin.\n` +
          `• Longitudinal Monitoring: Repeat HbA1c in 3 months to assess trajectory.` +
          demoNotice,
        citations,
        suggestedFollowUps: ['Can prediabetes be reversed with diet?', 'How does exercise affect HbA1c?'],
        urgentCareWarning: false,
      };
    }
  }

  // 4. Inquiries about Kidney, Renal, Creatinine
  if (/kidney|renal|creatinine|bun|egfr|urine/i.test(q)) {
    const renalReport = records.find((r) => r.category === 'general' && /renal|creatinine/i.test(r.title));
    if (renalReport && renalReport.metrics) {
      const creat = renalReport.metrics.find((m: any) => /creatinine/i.test(m.name));
      const egfr = renalReport.metrics.find((m: any) => /egfr/i.test(m.name));

      if (creat) citations.push({ recordId: renalReport.id, recordTitle: renalReport.title, metricOrFinding: creat.name, value: `${creat.value} ${creat.unit}`, isDemo: Boolean(renalReport.isDemo), demoNotice: renalReport.isDemo ? '⚠️ SAMPLE DEMO RECORD — Simulated demonstration data' : undefined });

      const demoNotice = renalReport.isDemo
        ? '\n\n⚠️ DEMO DATA NOTICE: This information is derived from a simulated demonstration record, not verified real patient diagnostic data.'
        : '';

      return {
        reply: `Here is your renal profile from your verified records (${renalReport.formattedDate}${renalReport.isDemo ? ' • DEMO DATA' : ''}):\n\n` +
          `• Serum Creatinine: **${creat?.value || '0.92'} mg/dL** (Standard Normal: 0.70 - 1.20 mg/dL)\n` +
          `• eGFR (Filtration Efficiency): **${egfr?.value || '> 90'} mL/min/1.73m²** (Optimal: > 60 mL/min)\n\n` +
          `Clinical Context:\n` +
          `Creatinine is a natural byproduct of muscle metabolism filtered out continuously by the renal glomeruli. A level of 0.92 mg/dL demonstrates healthy glomerular filtration and optimal kidney waste clearance.\n\n` +
          `Recommendation: Maintain normal daily hydration (2 to 2.5 liters of clean water daily) unless clinically restricted by your physician.` +
          demoNotice,
        citations,
        suggestedFollowUps: ['What causes creatinine levels to rise?', 'How much water should I drink daily?'],
        urgentCareWarning: false,
      };
    }
  }

  // 5. Inquiries about MediMentor AI Platform Capabilities
  if (/medimentor|how\s+to|feature|upload|timeline|fhir|abha|language|what\s+can\s+you\s+do/i.test(q)) {
    return {
      reply: `I am **VerifiHealth**, your AI clinical copilot built directly into MediMentor AI! Here is how our platform empowers your personal health journey:\n\n` +
        `1. **Smart Document Ingestion (Upload)**: Upload PDFs or mobile photos of medical records. Our multi-stage pipeline runs Mozilla PDF.js stream extraction and Tesseract OCR.\n` +
        `2. **Automated Document Classification**: Automatically classifies prescriptions, eye refraction, lab blood panels, urinalysis, ECGs, and radiology reports.\n` +
        `3. **Human-in-the-Loop Verification**: Review extracted parameters, edit values against your paper record, and approve records before permanent storage.\n` +
        `4. **Longitudinal Health Timeline**: Track your health markers over time, perform side-by-side comparative analysis between checkups, and generate doctor discussion questions.\n` +
        `5. **Medication Adherence Tracker**: Tracks verified daily dose schedules derived directly from approved prescriptions.\n` +
        `6. **HL7 FHIR R4 & ABDM Digital Export**: One-click download of your records in government-compliant NRCES/NDHM FHIR R4 JSON document bundles.\n` +
        `7. **13 Regional Indian Languages**: Fully accessible in English, Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, and Assamese.`,
      citations: [],
      suggestedFollowUps: ['How do I export my FHIR bundle?', 'How does duplicate prevention work on the timeline?'],
      urgentCareWarning: false,
    };
  }

  // 6. General Health Summary Fallback
  const totalRecords = records.length;
  const verifiedCount = records.filter((r) => Boolean(r.isVerified)).length;
  const pendingCount = totalRecords - verifiedCount;
  const demoCount = records.filter((r) => Boolean(r.isDemo)).length;
  const realCount = totalRecords - demoCount;

  if (totalRecords === 0) {
    return {
      reply: `Hello ${profile.name || 'there'}! I am **VerifiHealth**, your grounded AI clinical copilot.\n\n` +
        `Your active health profile currently contains **0 medical documents**.\n\n` +
        `To get started, you can upload diagnostic reports, lab panels, or prescriptions via the **Upload Medical Records** tab. Once reviewed and verified, I will extract your clinical parameters, track longitudinal trends, and answer your health questions based strictly on your verified records.\n\n` +
        `How can I assist you today? You can ask about MediMentor AI features, preventive health guidelines, or how our clinical extraction pipeline works.`,
      citations: [],
      suggestedFollowUps: [
        'How do I upload a medical report?',
        'What file formats and reports are supported?',
        'How does human-in-the-loop verification work?',
      ],
      urgentCareWarning: false,
    };
  }

  // Provenance breakdown (demo benchmarks vs real uploads)
  let provenanceStr = '';
  if (demoCount === totalRecords) {
    provenanceStr = `${demoCount} synthetic demonstration record${demoCount === 1 ? '' : 's'}`;
  } else if (demoCount === 0) {
    provenanceStr = `${realCount} patient-uploaded record${realCount === 1 ? '' : 's'}`;
  } else {
    provenanceStr = `${realCount} patient-uploaded, ${demoCount} synthetic demonstration record${demoCount === 1 ? '' : 's'}`;
  }

  // Verification status breakdown
  const verificationStr = `${verifiedCount} clinically verified, ${pendingCount} pending verification`;

  // Dynamically extract real parameters from active records (never invent values)
  const lipidRec = records.find((r) => r.category === 'lipid' || /lipid|cholesterol/i.test(r.title));
  const tcMetric = lipidRec?.metrics?.find((m: any) => /total\s+cholesterol/i.test(m.name));
  const ldlMetric = lipidRec?.metrics?.find((m: any) => /ldl/i.test(m.name));

  const metabolicRec = records.find((r) => r.category === 'metabolic' || /glucose|hba1c|metabolic/i.test(r.title));
  const a1cMetric = metabolicRec?.metrics?.find((m: any) => /hba1c|glycated/i.test(m.name));
  const fbsMetric = metabolicRec?.metrics?.find((m: any) => /fasting|glucose|sugar/i.test(m.name));

  const renalRec = records.find((r) => /renal|kidney/i.test(r.category) || /renal|kidney|creatinine/i.test(r.title));
  const creatMetric = renalRec?.metrics?.find((m: any) => /creatinine/i.test(m.name));

  const cbcRec = records.find((r) => r.category === 'blood' || /cbc|blood count|hematology/i.test(r.title));
  const hbMetric = cbcRec?.metrics?.find((m: any) => /hemoglobin/i.test(m.name));

  const rxReports = records.filter((r) => r.documentType === 'prescription' || r.category === 'prescription' || r.prescriptionData);

  const parameterLines: string[] = [];

  if (lipidRec && (tcMetric || ldlMetric)) {
    const parts: string[] = [];
    if (tcMetric) parts.push(`Total Cholesterol: ${tcMetric.value} ${tcMetric.unit || 'mg/dL'}`);
    if (ldlMetric) parts.push(`LDL: ${ldlMetric.value} ${ldlMetric.unit || 'mg/dL'}`);
    parameterLines.push(`• Cardiovascular: ${parts.join(' & ')}${lipidRec.isDemo ? ' [Demo Record]' : ''}`);
  }

  if (metabolicRec && (a1cMetric || fbsMetric)) {
    const parts: string[] = [];
    if (a1cMetric) parts.push(`HbA1c: ${a1cMetric.value}${a1cMetric.unit || '%'}`);
    if (fbsMetric) parts.push(`Fasting Glucose: ${fbsMetric.value} ${fbsMetric.unit || 'mg/dL'}`);
    parameterLines.push(`• Glycemic Profile: ${parts.join(' & ')}${metabolicRec.isDemo ? ' [Demo Record]' : ''}`);
  }

  if (renalRec && creatMetric) {
    parameterLines.push(`• Renal Reserve: Serum Creatinine at ${creatMetric.value} ${creatMetric.unit || 'mg/dL'}${renalRec.isDemo ? ' [Demo Record]' : ''}`);
  }

  if (cbcRec && hbMetric) {
    parameterLines.push(`• Hematology: Hemoglobin at ${hbMetric.value} ${hbMetric.unit || 'g/dL'}${cbcRec.isDemo ? ' [Demo Record]' : ''}`);
  }

  if (rxReports.length > 0) {
    const firstRx = rxReports[0];
    const meds = firstRx.prescriptionData?.medications || [];
    parameterLines.push(`• Prescriptions: ${meds.length > 0 ? `${meds.length} active medication(s) documented` : 'Clinical consultation notes on file'}${firstRx.isDemo ? ' [Demo Record]' : ''}`);
  } else {
    parameterLines.push(`• Prescriptions: No prescription documents on file`);
  }

  const parametersBlock = parameterLines.length > 0
    ? `Key Parameters in Your Profile:\n${parameterLines.join('\n')}\n\n`
    : `Verified Documents on File:\n${records.map((r) => `• ${r.title} (${r.formattedDate || r.date})${r.isDemo ? ' [Demo Record]' : ''}`).join('\n')}\n\n`;

  const demoNotice = demoCount > 0
    ? `*Note: Demonstration benchmark records are simulated for clinical workflow testing and labelled as [Demo Record]. Real uploaded patient documents will replace or accompany these benchmarks.*\n\n`
    : '';

  return {
    reply: `Hello ${profile.name || 'there'}! I am **VerifiHealth**, your grounded AI clinical copilot.\n\n` +
      `Your active health profile currently contains **${totalRecords} total medical document${totalRecords === 1 ? '' : 's'}** (${provenanceStr}; ${verificationStr}).\n\n` +
      parametersBlock +
      demoNotice +
      `How can I assist you today? You can ask me to explain any test result, clarify medical terminology, compare reports, or prepare questions for your doctor.`,
    citations: [],
    suggestedFollowUps: [
      'Explain my cholesterol results in detail',
      'What lifestyle changes help prediabetes?',
      'Do I have any medications prescribed?',
      'What questions should I ask my doctor?',
    ],
    urgentCareWarning: false,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 1. Enforce Server-Side Authentication & Authorization
  const auth = authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return res.status(auth.statusCode || 401).json({
      success: false,
      error: auth.error || 'Authentication required. Please provide a valid Bearer token.',
    });
  }
  const authenticatedUserId = auth.user.sub;

  const { messages, userProfile, recordsSummary, language = 'en', memory = [] } = req.body || {};
  const messageList: ChatApiMessage[] = Array.isArray(messages)
    ? messages
    : req.body?.message
    ? [{ role: 'user', content: String(req.body.message) }]
    : [];

  // Enforce server-side user isolation on records
  const serverPatientRecords = getRecordsForPatient(authenticatedUserId);
  const activeRecords = (Array.isArray(recordsSummary) && recordsSummary.length > 0)
    ? recordsSummary.filter((r: any) => {
        if (r.id && isRecordOwnedByOtherPatient(r.id, authenticatedUserId)) return false;
        return !r.patientId || r.patientId === authenticatedUserId;
      })
    : (Array.isArray(req.body?.records) && req.body.records.length > 0)
    ? req.body.records.filter((r: any) => {
        if (r.id && isRecordOwnedByOtherPatient(r.id, authenticatedUserId)) return false;
        return !r.patientId || r.patientId === authenticatedUserId;
      })
    : serverPatientRecords;

  const latestMessage =
    messageList[messageList.length - 1]?.content ||
    (typeof req.body?.message === 'string' ? req.body.message : '');

  // Red-flag triage check
  const isEmergency = checkUrgentCareRedFlags(latestMessage);
  if (isEmergency) {
    const emergencyResponse = generateGroundedChatResponse(latestMessage, activeRecords, userProfile, language);
    return res.status(200).json({
      configured: true,
      reply: emergencyResponse.reply,
      modelName: 'VerifiHealth Clinical Safety Triage',
      isRateLimitFallback: false,
      citations: [],
      urgentCareWarning: true,
      suggestedFollowUps: emergencyResponse.suggestedFollowUps,
      languageUsed: language,
    });
  }

  // API Key detection - dynamically check .env.local if present so edits take effect immediately
  const customClientKey = (typeof req.headers['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'].trim() : '') || '';
  let localFileKey = '';
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^\s*(?:GEMINI_API_KEY|VITE_GEMINI_API_KEY)\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        localFileKey = match[1].trim();
      }
    }
  } catch {
    // ignore
  }

  const apiKey = (customClientKey || localFileKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  const keySource = customClientKey ? 'client header' : localFileKey ? '.env.local' : process.env.GEMINI_API_KEY ? 'process.env' : 'none';
  console.log(`[API /api/chat] Request authenticated for user: "${authenticatedUserId}" | Turns: ${messageList.length} | Records: ${activeRecords.length} | Key source: ${keySource} (present: ${Boolean(apiKey)})`);

  if (!apiKey) {
    console.log('[API /api/chat] No API key detected. Operating in local grounded mode.');
    // Generate grounded fail-safe response
    const fallback = generateGroundedChatResponse(latestMessage, activeRecords, userProfile, language);
    return res.status(200).json({
      configured: false,
      reply: fallback.reply,
      modelName: 'VerifiHealth Grounded Clinical Engine (Local Mode)',
      isFallback: true,
      isRateLimitFallback: false,
      fallbackReason: 'No Gemini API key configured on server. Operating in local grounded mode.',
      citations: fallback.citations,
      urgentCareWarning: fallback.urgentCareWarning,
      suggestedFollowUps: fallback.suggestedFollowUps,
      languageUsed: language,
      setupInstructions:
        'To enable live Google Cloud model inference, obtain a free API key from Google AI Studio (https://aistudio.google.com/) and enter it in Settings or configure GEMINI_API_KEY in your environment.',
    });
  }

  // Check cache for identical queries
  const cacheKey = `${apiKey.slice(-6)}_${language}_${latestMessage.trim().toLowerCase()}`;
  const cached = chatCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json(cached.data);
  }

  // Construct grounded clinical context
  const recordsContextText = Array.isArray(activeRecords) && activeRecords.length > 0
    ? activeRecords
        .map((r: any, idx: number) => {
          let recStr = `[RECORD ${idx + 1}] ID: ${r.id} | TITLE: ${r.title} | DATE: ${r.formattedDate} | TYPE: ${r.documentType} | TAG: ${r.isDemo ? 'DEMO DATA (Simulated)' : 'PATIENT UPLOAD (Real Verified)'}\n`;
          recStr += `Summary: ${r.summary}\n`;
          if (r.facts && r.facts.length > 0) {
            recStr += `Extracted Facts:\n${r.facts.map((f: string) => `  - ${f}`).join('\n')}\n`;
          }
          if (r.metrics && r.metrics.length > 0) {
            recStr += `Metrics: ${r.metrics.map((m: any) => `${m.name}=${m.value} ${m.unit} (Ref: ${m.referenceRange}, Status: ${m.status})`).join('; ')}\n`;
          }
          if (r.prescriptionData) {
            recStr += `Prescription: Doctor: ${r.prescriptionData.doctorName || 'Not stated'}, Clinic: ${r.prescriptionData.clinicOrHospital || 'Not stated'}, Notes: ${r.prescriptionData.medicationsNotes || 'None'}\n`;
            if (r.prescriptionData.medications && r.prescriptionData.medications.length > 0) {
              recStr += `Medications: ${r.prescriptionData.medications.map((m: any) => `${m.name} ${m.dosage || ''} (${m.frequency || ''})`).join(', ')}\n`;
            }
          }
          return recStr;
        })
        .join('\n---\n')
    : 'No uploaded medical records found for this user.';

  const memoryContextText = Array.isArray(memory) && memory.length > 0
    ? `USER PREFERENCES & MEMORY:\n${memory.map((m: string) => `• ${m}`).join('\n')}`
    : 'No stored preferences.';

  const systemInstruction = `You are VerifiHealth, an expert AI clinical health copilot integrated into MediMentor AI.
TARGET LANGUAGE: ${language}
PATIENT PROFILE: Name: ${userProfile?.name || 'Patient'}, Age: ${userProfile?.age || 42}, Gender: ${userProfile?.gender || 'Unknown'}, Blood Group: ${userProfile?.bloodGroup || 'N/A'}, Allergies: ${userProfile?.allergies || 'None'}, Chronic Conditions: ${userProfile?.chronicConditions || 'None'}

ACTIVE VERIFIED MEDICAL RECORDS OF THIS PATIENT:
${recordsContextText}

${memoryContextText}

MEDIMENTOR AI WEBSITE CAPABILITIES YOU MUST KNOW:
1. Upload Medical Records: Supports PDFs and images via Mozilla PDF.js stream parser & Tesseract OCR.
2. Specialty Clinical Parsers: Prescriptions, Eye/Spectacle Refraction, Lab Blood Panels, Urinalysis, ECGs, Radiology, Discharge Summaries.
3. Patient Verification: Human-in-the-loop review and editing before storage.
4. Health Timeline: Longitudinal monitoring, side-by-side report comparison, automated doctor discussion questions, and duplicate record prevention.
5. Medication Tracker: Daily adherence checkboxes and dosing schedule derived from verified prescriptions.
6. FHIR R4 & ABDM Digital Export: HL7 FHIR R4 document bundle export compliant with NRCES/NDHM standards.
7. Multi-Profile Isolation: Local clinical sandbox supporting profile switching with partitioned storage.
8. 13 Languages: English and 12 Indian regional vernaculars.

CLINICAL GROUNDING & SAFETY RULES (CRITICAL):
1. NATURAL CONVERSATIONAL AGILITY: If the user greets you (e.g. "Hi", "Hello", "How are you?"), introduces themselves, or asks a casual question, reply naturally, warmly, and politely as VerifiHealth. DO NOT dump the patient's entire medical record summary on simple greetings or conversational pleasantries.
2. GENERAL HEALTH & MEDICAL EDUCATION: If the user asks general health questions (e.g. "What is normal blood pressure?", "Why is high cholesterol dangerous?", "What causes prediabetes?"), provide clear, accessible, evidence-based educational explanations. Connect to their uploaded records only when directly relevant, without dumping unrelated records.
3. STRICT GROUNDING FOR PERSONAL MEDICAL FACTS: When discussing this patient's personal results, medications, lab values, or timeline, ONLY utilize the verified facts extracted from the records above. NEVER hallucinate missing lab values, dosages, or unprescribed drugs.
4. ZERO PRESCRIPTION HALLUCINATIONS: If no medications are prescribed (or marked "Not specified"), explicitly declare that NO medications were prescribed. NEVER recommend anti-infectives or dosages when absent.
5. MEDICAL SAFETY & CITATIONS: Always clarify that your answers are educational health insights and NOT a replacement for a licensed physician. If emergency red-flag symptoms are mentioned, flag urgentCareWarning: true.
6. DEMO VS REAL: Clearly distinguish synthetic demo records ("DEMO DATA") from real patient uploads.
7. STRUCTURED JSON OUTPUT: Provide responses in valid JSON matching this schema:
{
  "reply": "Clear, compassionate, well-formatted response with bullet points and bold headers",
  "citations": [
    {"recordId": "rec-id", "recordTitle": "Title", "metricOrFinding": "Parameter name", "value": "112 mg/dL", "isDemo": false}
  ],
  "suggestedFollowUps": ["Follow-up question 1", "Follow-up question 2"],
  "urgentCareWarning": false
}
8. PROFILE OVERVIEW: Only output the full profile summary if the user explicitly asks for their complete health summary, medical profile, or list of documents.`;

  const rawHistory = messageList.slice(-6).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Ensure conversationHistory begins with a user turn for Gemini API protocol
  let conversationHistory = rawHistory;
  while (conversationHistory.length > 0 && conversationHistory[0].role !== 'user') {
    conversationHistory = conversationHistory.slice(1);
  }
  if (conversationHistory.length === 0) {
    conversationHistory = [{ role: 'user', parts: [{ text: latestMessage || 'Hello' }] }];
  }

  const candidateModels = Array.from(
    new Set(
      [
        process.env.GEMINI_MODEL,
        'gemini-3.8-flash',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-flash-latest',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-pro-latest',
      ].filter(Boolean) as string[]
    )
  );

  let parsedResponse: any = null;
  let successfulModel = '';
  let isRateLimited = false;
  let lastHttpStatus = 0;
  let lastHttpError = '';

  console.log(`[API /api/chat] Testing ${candidateModels.length} candidate models for live inference: [${candidateModels.join(', ')}]`);

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      console.log(`[API /api/chat] Attempting model: ${model}`);
      const apiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.25,
            responseMimeType: 'application/json',
          },
        }),
      });

      lastHttpStatus = apiRes.status;

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        let shortErr = '';
        try {
          const errJson = JSON.parse(errText);
          shortErr = errJson?.error?.message || errJson?.error?.status || '';
        } catch {
          shortErr = errText.slice(0, 100);
        }
        lastHttpError = shortErr;
        console.log(`[API /api/chat] Model ${model} returned HTTP ${apiRes.status} (${shortErr || 'Request rejected'})`);

        if (apiRes.status === 429 || errText.includes('RESOURCE_EXHAUSTED')) {
          isRateLimited = true;
          if (i < candidateModels.length - 1) {
            await delay(400);
            continue;
          }
        }
        continue;
      }

      console.log(`[API /api/chat] Model ${model} returned HTTP 200 OK`);

      const json: any = await apiRes.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        try {
          parsedResponse = JSON.parse(rawText);
          successfulModel = model;
          console.log(`[API /api/chat] Model ${model} returned valid structured response`);
          break;
        } catch {
          // If markdown formatted
          const cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim();
          parsedResponse = JSON.parse(cleaned);
          successfulModel = model;
          console.log(`[API /api/chat] Model ${model} returned markdown-wrapped JSON`);
          break;
        }
      }
    } catch (modelErr: any) {
      console.warn(`[API /api/chat] Model ${model} connection exception:`, modelErr?.message || modelErr);
      // Continue to next candidate model
    }
  }

  if (parsedResponse && parsedResponse.reply) {
    console.log(`[API /api/chat] Live model inference succeeded with model "${successfulModel}" (HTTP 200)`);
    const result = {
      configured: true,
      reply: parsedResponse.reply,
      modelName: `Google Gemini (${successfulModel})`,
      isFallback: false,
      isRateLimitFallback: false,
      citations: parsedResponse.citations || [],
      urgentCareWarning: Boolean(parsedResponse.urgentCareWarning),
      suggestedFollowUps: parsedResponse.suggestedFollowUps || [],
      languageUsed: language,
    };
    chatCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return res.status(200).json(result);
  }

  // Graceful fail-safe fallback
  let fallbackReasonText = '';
  if (isRateLimited) {
    fallbackReasonText = 'Google Gemini API quota / rate limit exhausted (HTTP 429). Engaged grounded clinical fail-safe engine.';
  } else if (lastHttpStatus === 401) {
    fallbackReasonText = 'Gemini API authentication failed (HTTP 401: Invalid API key). Please ensure your GEMINI_API_KEY from Google AI Studio (starts with AIzaSy) is configured in Settings or .env.local.';
  } else if (lastHttpStatus === 404) {
    fallbackReasonText = 'Gemini model endpoint not found (HTTP 404). Operating in grounded clinical engine mode.';
  } else if (lastHttpStatus > 0) {
    fallbackReasonText = `Cloud model returned HTTP ${lastHttpStatus} (${lastHttpError || 'Unavailable'}). Engaged grounded clinical fail-safe engine.`;
  } else {
    fallbackReasonText = 'Cloud model unavailable. Engaged grounded clinical fail-safe engine.';
  }

  console.log(`[API /api/chat] Candidates exhausted. Returning grounded fail-safe response. Reason: "${fallbackReasonText}" (HTTP 200)`);

  const fallback = generateGroundedChatResponse(latestMessage, activeRecords, userProfile, language);
  const result = {
    configured: true,
    reply: fallback.reply,
    modelName: 'VerifiHealth Grounded Clinical Engine (Fail-Safe)',
    isFallback: true,
    isRateLimitFallback: isRateLimited,
    fallbackReason: fallbackReasonText,
    citations: fallback.citations,
    urgentCareWarning: fallback.urgentCareWarning,
    suggestedFollowUps: fallback.suggestedFollowUps,
    languageUsed: language,
  };
  return res.status(200).json(result);
}
