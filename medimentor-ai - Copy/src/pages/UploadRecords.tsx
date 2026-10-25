import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileCheck,
  Sparkles,
  RefreshCw,
  FileText,
  AlertCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  Save,
  HelpCircle,
  ShieldCheck,
  User,
  Calendar,
  Building2,
  MapPin,
  Pill,
  Stethoscope,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useReports } from '../context/ReportsContext';
import { extractTextFromDocument } from '../services/ocrService';
import { classifyMedicalDocument } from '../services/classifierService';
import { parseSpecialtyDocument } from '../services/parserService';
import { requestAiExplanation } from '../services/aiService';
import { saveServerRecord } from '../services/chatService';
import type {
  DocumentType,
  OcrExtractionResult,
  DocumentClassificationResult,
  ExtractedDocumentData,
  AiExplanationResult,
  PrescriptionMedication,
} from '../types/document';
import { PRESCRIPTION_FALLBACKS } from '../types/document';
import type { MedicalReport } from '../types/report';

export const UploadRecords: React.FC = () => {
  const { t, language } = useLanguage();
  const { addReport, profile } = useReports();
  const navigate = useNavigate();

  // Workflow steps:
  // 1: Upload -> 2: OCR -> 3: Classification -> 4: Review & Edit -> 5: User Verify -> 6: AI Explain -> 7: Complete
  const [activeStep, setActiveStep] = useState<number>(1);

  // File & Preview State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // OCR Extraction State
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  // Classification State
  const [classification, setClassification] = useState<DocumentClassificationResult | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('lab_report');

  // Specialty Parsed Data
  const [parsedData, setParsedData] = useState<ExtractedDocumentData | null>(null);

  // User Verification State
  const [isVerifiedByUser, setIsVerifiedByUser] = useState(false);

  // AI Explanation State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiExplanationResult | null>(null);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      resetPipeline();
    }
  };

  const resetPipeline = () => {
    setActiveStep(1);
    setOcrResult(null);
    setClassification(null);
    setParsedData(null);
    setIsVerifiedByUser(false);
    setAiResult(null);
  };

  // Sample Documents with Real Medical Content for Testing
  const loadSampleDocument = (type: DocumentType) => {
    let sampleContent = '';
    let fileName = '';

    if (type === 'eye_prescription') {
      fileName = 'Eye_Refraction_Prescription.txt';
      sampleContent = `DR. MEERA PATEL, M.S. (OPHTHALMOLOGY)
VISION CARE EYE CLINIC & SURGERY CENTRE
Date: 12-Oct-2026

REFRACTION SPECTACLE PRESCRIPTION:
Patient: Arjun Sharma    Age: 42    Gender: Male

DISTANCE:
OD (Right Eye): SPH -2.25   CYL -0.75   AXIS 180°   VA 6/6
OS (Left Eye):  SPH -1.75   CYL -0.50   AXIS 90°    VA 6/6

NEAR ADDITION:
OD: ADD +1.75
OS: ADD +1.75

P.D. (Pupillary Distance): 63 mm
Lens Recommendation: Anti-reflective, Blue-cut progressive lenses.
Signature: Dr. M. Patel`;
    } else if (type === 'urine_test') {
      fileName = 'Urinalysis_Lab_Report.txt';
      sampleContent = `METROPOLIS HEALTHCARE LABS
DEPARTMENT OF CLINICAL PATHOLOGY
URINALYSIS / URINE ROUTINE EXAMINATION
Date: 12-Oct-2026
Patient: Arjun Sharma   Age: 42   Gender: M

PHYSICAL EXAMINATION:
Color: Pale Yellow
Appearance: Clear
Specific Gravity: 1.018 (Ref: 1.005 - 1.030)
Reaction (pH): 6.0 (Ref: 4.5 - 8.0)

CHEMICAL EXAMINATION:
Urine Glucose: Negative (Ref: Negative)
Urine Protein: Trace (Ref: Negative)
Urine Ketones: Negative
Urobilinogen: Normal

MICROSCOPIC EXAMINATION:
Pus Cells: 2 - 3 /HPF (Ref: 0 - 5 /HPF)
Epithelial Cells: 1 - 2 /HPF (Ref: 0 - 5 /HPF)
Red Blood Cells (RBC): Nil (Ref: Nil)
Casts: None seen`;
    } else if (type === 'ecg_report') {
      fileName = 'Resting_12_Lead_ECG.txt';
      sampleContent = `CARDIOLOGY DIAGNOSTIC SERVICES
12-LEAD RESTING ELECTROCARDIOGRAM (ECG)
Date: 12-Oct-2026
Patient: Arjun Sharma   Age: 42   Gender: Male

MEASUREMENTS:
Ventricular Rate: 72 bpm
PR Interval: 146 ms (Ref: 120 - 200 ms)
QRS Duration: 88 ms (Ref: 80 - 110 ms)
QT/QTc Interval: 382/418 ms (Ref: < 440 ms)
P-R-T Axes: 45° 52° 40°

INTERPRETATION:
Normal Sinus Rhythm.
Normal axis. No acute ST segment elevation or T wave abnormality.
Normal resting ECG study.
Verified by: Dr. R. K. Varma, FACC`;
    } else if (type === 'radiology_report') {
      fileName = 'Chest_XRay_Report.txt';
      sampleContent = `APOLLO RADIOLOGY & IMAGING
DEPARTMENT OF RADIODIAGNOSIS
CHEST X-RAY (PA VIEW)
Date: 12-Oct-2026
Patient: Arjun Sharma   Age: 42   Gender: Male

CLINICAL INDICATION: Routine health assessment.

FINDINGS:
- Trachea is midline.
- Both lung fields are clear with normal vascular markings.
- No consolidation, focal mass, or pleural effusion seen.
- Cardiothoracic ratio is within normal limits.
- Bony thorax and visualized soft tissues are unremarkable.

IMPRESSION:
Normal chest radiograph. No acute cardiopulmonary pathology.
Consultant Radiologist: Dr. S. Nair, MD (Radio)`;
    } else if (type === 'prescription') {
      fileName = 'Medical_Prescription.txt';
      sampleContent = `CITY HEALTH CLINIC & OUTPATIENT CARE
Dr. Ramesh Gupta, MBBS, MD (Internal Medicine)
Reg. No: MCI-49201
Date: 12-Oct-2026
Patient: Arjun Sharma    Age: 42    Gender: Male

Diagnosis / Complaints: Acute upper respiratory tract infection with mild fever.

Rx (Prescription):
1. Tab. Paracetamol 650mg — 1-0-1 (Twice daily after food) for 3 days
2. Cap. Amoxicillin 500mg — 1-0-1 (Twice daily after food) for 5 days
3. Tab. Cetirizine 10mg — 0-0-1 (Once at bedtime) for 5 days

Doctor Advice / Instructions:
Drink plenty of warm fluids, rest well, and report back if fever exceeds 101°F.
Signature: Dr. R. Gupta`;
    } else if (type === 'unsupported') {
      fileName = 'Grocery_Store_Receipt.txt';
      sampleContent = `SUPERMART RETAIL OUTLET #441
Transaction: 994819
Apples 1kg: 140.00
Milk 2L: 120.00
Bread: 45.00
Total: 305.00
Thank you for shopping with us!`;
    } else {
      // Default CBC Blood Test
      fileName = 'Complete_Blood_Count.txt';
      sampleContent = `APOLLO DIAGNOSTICS LABORATORY
COMPLETE BLOOD COUNT (CBC) REPORT
Patient: Arjun Sharma   Age: 42   Gender: Male
Collection Date: 12-Oct-2026

TEST PARAMETER                     RESULT   UNIT       REFERENCE RANGE
Hemoglobin (Hb)                    14.4     g/dL       13.0 - 17.0
Total Leukocyte Count (WBC)        6900     cells/mcL  4000 - 11000
Platelet Count                     255000   /mcL       150000 - 450000
Packed Cell Volume (PCV)           43.5     %          40.0 - 50.0
Mean Corpuscular Volume (MCV)      86.2     fL         80.0 - 100.0
Status: Normal haematological profile. Verified by Pathologist.`;
    }

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const file = new File([blob], fileName, { type: 'text/plain' });
    setSelectedFile(file);
    try {
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setPreviewUrl(null);
    }
    resetPipeline();
  };

  // STEP 2: Execute Real OCR
  const runOcrAndClassification = async () => {
    if (!selectedFile) return;

    setIsOcrLoading(true);
    setOcrProgress(5);
    setOcrStatusText('Initiating real document extraction...');
    setActiveStep(2);

    try {
      // Real extraction using Tesseract.js / pdfjs-dist
      const res = await extractTextFromDocument(selectedFile, (progress, status) => {
        setOcrProgress(progress);
        setOcrStatusText(status);
      });

      setOcrResult(res);

      if (!res.success) {
        setIsOcrLoading(false);
        return;
      }

      // STEP 3: Content-based classification (evaluates rawText, never file name)
      setOcrStatusText('Classifying document content...');
      const classRes = classifyMedicalDocument(res.rawText);
      setClassification(classRes);
      setSelectedDocType(classRes.type);

      // STEP 4: Specialty-specific parsing
      setOcrStatusText('Extracting specialty clinical data...');
      const parsed = parseSpecialtyDocument(res.rawText, classRes);
      setParsedData(parsed);

      setIsOcrLoading(false);
      setActiveStep(4); // Move to review step
    } catch (err: any) {
      setIsOcrLoading(false);
      setOcrResult({
        success: false,
        rawText: '',
        charCount: 0,
        fileType: selectedFile.type,
        fileName: selectedFile.name,
        fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`,
        error: `OCR processing crashed: ${err?.message || 'Unknown processing error'}`,
      });
    }
  };

  // Update classification if user manually overrides ambiguous type
  const handleTypeOverride = (type: DocumentType) => {
    setSelectedDocType(type);
    if (ocrResult?.rawText) {
      const updatedClassification: DocumentClassificationResult = {
        type,
        confidence: 100,
        isAmbiguous: false,
        detectedKeywords: classification?.detectedKeywords || [],
        reason: 'Manually confirmed by user.',
      };
      setClassification(updatedClassification);
      const reParsed = parseSpecialtyDocument(ocrResult.rawText, updatedClassification);
      setParsedData(reParsed);
    }
  };

  // STEP 6: Execute Real AI Explanation Request
  const handleRequestAi = async () => {
    if (!parsedData) return;

    setIsAiLoading(true);
    setActiveStep(6);

    try {
      const explanation = await requestAiExplanation(parsedData, language);
      setAiResult(explanation);
    } catch (err) {
      console.error('Failed to request AI explanation', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // STEP 7: Save to Patient Health Records
  const handleSaveToRecords = () => {
    if (!parsedData) return;
    if (selectedDocType === 'unsupported') {
      alert('Please confirm the document type in Step 3 before saving to records.');
      return;
    }

    const newReportId = `rep-${Date.now()}`;
    const formattedDate = parsedData.documentDate || new Date().toLocaleDateString('en-GB');

    const newReport: MedicalReport = {
      id: newReportId,
      title: getDocumentTitle(selectedDocType),
      category: mapCategory(selectedDocType),
      documentType: selectedDocType,
      date: new Date().toISOString().split('T')[0] || '2026-10-12',
      formattedDate,
      labName: parsedData.facilityName || 'Clinical Diagnostic Services',
      patientName: parsedData.patientName || profile.name,
      patientAge: profile.age,
      patientGender: profile.gender,
      fileName: selectedFile?.name || 'Document.pdf',
      fileSize: ocrResult?.fileSize || '1.0 MB',
      previewUrl: previewUrl || undefined,
      rawText: ocrResult?.rawText,
      metrics: parsedData.labMetrics || [],
      eyeData: parsedData.eyeData,
      ecgData: parsedData.ecgData,
      radiologyData: parsedData.radiologyData,
      prescriptionData: parsedData.prescriptionData,
      dischargeData: parsedData.dischargeData,
      isVerified: true,
      isDemo: false, // REAL EXTRACTED RECORD!
      isRealOcr: true,
      confidence: classification?.confidence || 95,
      overallStatus: 'normal',
      summary: aiResult?.aiExplanation || 'Document verified by patient against original paper record.',
      factsFromDocument: aiResult?.factsFromDocument || [],
      keyFindings: aiResult?.factsFromDocument || ['Parameters reviewed and approved.'],
      nextSteps: aiResult?.clinicalConsiderations || ['Routine healthcare follow-up.'],
      questionsForDoctor: [
        'How do these findings correlate with my personal medical history?',
        'Are follow-up evaluations needed for any parameter?',
      ],
      aiExplanation: aiResult?.aiExplanation,
    };

    addReport(newReport);
    // Persist verified report to server storage as well as localStorage
    saveServerRecord(profile.id, newReport).catch((err) => {
      console.warn('[Persistence] Server save skipped/failed:', err);
    });
    setActiveStep(7);
  };

  const getDocumentTitle = (type: DocumentType): string => {
    switch (type) {
      case 'eye_prescription':
        return 'Spectacle & Eye Refraction Prescription';
      case 'urine_test':
        return 'Urinalysis / Urine Routine Examination';
      case 'ecg_report':
        return '12-Lead Electrocardiogram (ECG)';
      case 'radiology_report':
        return 'Diagnostic Radiology & Imaging Report';
      case 'prescription':
        return 'Clinical Medication Prescription';
      case 'discharge_summary':
        return 'Inpatient Hospital Discharge Summary';
      case 'lab_report':
        return 'Diagnostic Laboratory Blood Panel';
      case 'unsupported':
      default:
        return 'Unrecognized / Unsupported Document';
    }
  };

  const mapCategory = (type: DocumentType): any => {
    switch (type) {
      case 'eye_prescription':
        return 'eye';
      case 'urine_test':
        return 'urine';
      case 'ecg_report':
        return 'cardiac';
      case 'radiology_report':
        return 'radiology';
      case 'prescription':
        return 'prescription';
      default:
        return 'blood';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Real Clinical Processing Pipeline
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                OCR &amp; AI
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('uploadTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Upload PDF or image files for real Optical Character Recognition, content-based document classification, and grounded AI explanations.
            </p>
          </div>

          {/* Quick sample fillers */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <button
              onClick={() => loadSampleDocument('prescription')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
            >
              + Prescription
            </button>
            <button
              onClick={() => loadSampleDocument('eye_prescription')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
            >
              + Eye Rx
            </button>
            <button
              onClick={() => loadSampleDocument('lab_report')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
            >
              + Blood CBC
            </button>
            <button
              onClick={() => loadSampleDocument('urine_test')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
            >
              + Urine Test
            </button>
            <button
              onClick={() => loadSampleDocument('ecg_report')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
            >
              + ECG
            </button>
            <button
              onClick={() => loadSampleDocument('radiology_report')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
            >
              + X-Ray
            </button>
            <button
              onClick={() => loadSampleDocument('unsupported')}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors cursor-pointer"
            >
              + Invalid Doc
            </button>
          </div>
        </div>

        {/* Process Flow Breadcrumb */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 overflow-x-auto gap-2">
          <span className={`flex items-center gap-1.5 ${activeStep >= 1 ? 'text-teal-700 font-bold' : ''}`}>
            1. Upload
          </span>
          <span>→</span>
          <span className={`flex items-center gap-1.5 ${activeStep >= 2 ? 'text-teal-700 font-bold' : ''}`}>
            2. Real OCR
          </span>
          <span>→</span>
          <span className={`flex items-center gap-1.5 ${activeStep >= 3 ? 'text-teal-700 font-bold' : ''}`}>
            3. Classification
          </span>
          <span>→</span>
          <span className={`flex items-center gap-1.5 ${activeStep >= 4 ? 'text-teal-700 font-bold' : ''}`}>
            4. Review &amp; Edit
          </span>
          <span>→</span>
          <span className={`flex items-center gap-1.5 ${activeStep >= 5 ? 'text-teal-700 font-bold' : ''}`}>
            5. User Verify
          </span>
          <span>→</span>
          <span className={`flex items-center gap-1.5 ${activeStep >= 6 ? 'text-teal-700 font-bold' : ''}`}>
            6. AI Explain
          </span>
          <span>→</span>
          <span className={`flex items-center gap-1.5 ${activeStep >= 7 ? 'text-teal-700 font-bold' : ''}`}>
            7. Saved
          </span>
        </div>
      </div>

      {/* STEP 1: Upload Dropzone & Document Preview */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-5">
        <label
          htmlFor="doc-file-input"
          className="block border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-teal-50/20 hover:bg-teal-50/50 transition-all group"
        >
          <input
            id="doc-file-input"
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
          />

          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <p className="text-sm sm:text-base font-bold text-slate-800">
            {selectedFile ? (
              <span className="text-teal-700 font-extrabold flex items-center justify-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            ) : (
              'Drag & Drop your medical document here (PDF, JPG, PNG)'
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports scanned or digital lab tests, eye prescriptions, ECGs, urine tests, radiology reports, or discharge summaries
          </p>
          <span className="inline-block mt-3 text-xs font-semibold text-teal-700 group-hover:underline">
            or click to browse local files
          </span>
        </label>

        {/* Selected Document Preview */}
        {selectedFile && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB • Type: {selectedFile.type || 'Plain Document'}
                </p>
              </div>
            </div>

            <button
              onClick={runOcrAndClassification}
              disabled={isOcrLoading}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                isOcrLoading
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white hover:scale-101'
              }`}
            >
              {isOcrLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{ocrProgress}% {ocrStatusText}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Document OCR &amp; Classify</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* OCR PROGRESS / EXTRACTION FAILURE ALERT */}
      {isOcrLoading && (
        <div className="bg-white rounded-3xl p-6 border border-teal-200 shadow-2xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              {ocrStatusText}
            </span>
            <span className="text-xs font-extrabold text-teal-800">{ocrProgress}%</span>
          </div>
          <div className="w-full bg-teal-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* OCR Failure Alert */}
      {ocrResult && !ocrResult.success && (
        <div className="bg-rose-50 border border-rose-300 rounded-3xl p-6 text-rose-900 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-rose-900">
                Document Extraction Failure
              </h4>
              <p className="text-xs text-rose-800 leading-relaxed">
                {ocrResult.error}
              </p>
              <p className="text-[11px] text-rose-700 pt-1">
                Recommendation: Ensure the uploaded image or PDF is not blurry, skewed, blank, or low resolution. Try uploading a clearer scan or photo of your medical document.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 & 4: CLASSIFICATION CONFIRMATION & SPECIALTY-SPECIFIC REVIEW */}
      {ocrResult?.success && parsedData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Classification Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block mb-1">
                  Step 3 • Content-Based Document Classification
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Detected Type:</span>
                  <span className="px-3 py-1 rounded-xl bg-teal-100 text-teal-900 border border-teal-300 text-base">
                    {getDocumentTitle(selectedDocType)}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {classification?.reason} (Classified from content analysis; never by file name)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                    (classification?.confidence || 0) < 60 || selectedDocType === 'unsupported' || classification?.isAmbiguous
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  Confidence: {classification?.confidence}%
                </span>
              </div>
            </div>

            {/* Low-confidence or Ambiguous Warning */}
            {((classification?.confidence || 0) < 60 || selectedDocType === 'unsupported' || classification?.isAmbiguous) && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-amber-950">Action Required: Low Confidence or Unconfirmed Document Classification</p>
                  <p className="mt-0.5 text-amber-800">
                    The automated classifier detected this document with lower confidence ({classification?.confidence}%) or ambiguous traits. To prevent errors, please confirm or select the correct medical specialty category below before continuing.
                  </p>
                </div>
              </div>
            )}

            {/* Ambiguity or Manual Correction Selector */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  Is the detected document type incorrect? Confirm or switch type:
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'eye_prescription',
                    'lab_report',
                    'urine_test',
                    'ecg_report',
                    'radiology_report',
                    'prescription',
                    'discharge_summary',
                  ] as DocumentType[]
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeOverride(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedDocType === type
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {getDocumentTitle(type)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Specialty-Specific Extracted Data View */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block mb-1">
                  Step 4 • Extracted Data Review &amp; Inline Editing
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Clinical Data Extracted From Document
                </h3>
              </div>
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
              >
                {showRawText ? 'Hide Raw OCR Text' : 'View Raw OCR Text'}
              </button>
            </div>

            {/* Raw OCR Text Accordion */}
            {showRawText && (
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {ocrResult.rawText}
              </div>
            )}

            {/* Original Document Reference Preview (Retained for Checking & Verification) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Original Document Reference (Retained for Verification)
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {selectedFile?.name} ({ocrResult.fileSize})
                </span>
              </div>

              {selectedFile?.type.startsWith('image/') && previewUrl ? (
                <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-2 flex justify-center">
                  <img
                    src={previewUrl}
                    alt="Uploaded medical document"
                    className="max-h-68 object-contain rounded-lg"
                  />
                </div>
              ) : selectedFile?.type === 'application/pdf' && previewUrl ? (
                <div className="rounded-xl border border-slate-200 bg-white p-1">
                  <iframe
                    src={previewUrl}
                    title="Uploaded medical PDF"
                    className="w-full h-64 rounded-lg"
                  />
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {ocrResult.rawText}
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Cross-check the extracted values below against this original document before proceeding to human verification.
              </p>
            </div>

            {/* CASE 1: EYE PRESCRIPTION VIEW */}
            {selectedDocType === 'eye_prescription' && parsedData.eyeData && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200">
                  <div className="flex items-center gap-2 font-bold text-sm text-teal-900 mb-2">
                    <Eye className="w-5 h-5 text-teal-600" />
                    <span>Optometric Refraction Findings</span>
                  </div>
                  <p className="text-xs text-teal-800">
                    Extracted optical values for Right Eye (OD) and Left Eye (OS). You can modify any value below before user verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* OD: Right Eye */}
                  <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/40">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                      <span>Right Eye (OD - Oculus Dexter)</span>
                      <span className="text-xs text-teal-700 font-bold">OD</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Sphere (SPH)</label>
                        <input
                          type="text"
                          value={parsedData.eyeData.od.sph || ''}
                          onChange={(e) => {
                            if (parsedData.eyeData) {
                              setParsedData({
                                ...parsedData,
                                eyeData: {
                                  ...parsedData.eyeData,
                                  od: { ...parsedData.eyeData.od, sph: e.target.value },
                                },
                              });
                            }
                          }}
                          placeholder="-2.00"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Cylinder (CYL)</label>
                        <input
                          type="text"
                          value={parsedData.eyeData.od.cyl || ''}
                          onChange={(e) => {
                            if (parsedData.eyeData) {
                              setParsedData({
                                ...parsedData,
                                eyeData: {
                                  ...parsedData.eyeData,
                                  od: { ...parsedData.eyeData.od, cyl: e.target.value },
                                },
                              });
                            }
                          }}
                          placeholder="-0.50"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Axis</label>
                        <input
                          type="text"
                          value={parsedData.eyeData.od.axis || ''}
                          onChange={(e) => {
                            if (parsedData.eyeData) {
                              setParsedData({
                                ...parsedData,
                                eyeData: {
                                  ...parsedData.eyeData,
                                  od: { ...parsedData.eyeData.od, axis: e.target.value },
                                },
                              });
                            }
                          }}
                          placeholder="180°"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Near Add (ADD)</label>
                        <input
                          type="text"
                          value={parsedData.eyeData.od.add || ''}
                          onChange={(e) => {
                            if (parsedData.eyeData) {
                              setParsedData({
                                ...parsedData,
                                eyeData: {
                                  ...parsedData.eyeData,
                                  od: { ...parsedData.eyeData.od, add: e.target.value },
                                },
                              });
                            }
                          }}
                          placeholder="+1.75"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* OS: Left Eye */}
                  <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/40">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                      <span>Left Eye (OS - Oculus Sinister)</span>
                      <span className="text-xs text-teal-700 font-bold">OS</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Sphere (SPH)</label>
                        <input
                          type="text"
                          value={parsedData.eyeData.os.sph || ''}
                          onChange={(e) => {
                            if (parsedData.eyeData) {
                              setParsedData({
                                ...parsedData,
                                eyeData: {
                                  ...parsedData.eyeData,
                                  os: { ...parsedData.eyeData.os, sph: e.target.value },
                                },
                              });
                            }
                          }}
                          placeholder="-1.75"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Cylinder (CYL)</label>
                        <input
                          type="text"
                          value={parsedData.eyeData.os.cyl || ''}
                          onChange={(e) => {
                            if (parsedData.eyeData) {
                              setParsedData({
                                ...parsedData,
                                eyeData: {
                                  ...parsedData.eyeData,
                                  os: { ...parsedData.eyeData.os, cyl: e.target.value },
                                },
                              });
                            }
                          }}
                          placeholder="-0.50"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Axis</label>
                        <input
                          type="text"
                          value={parsedData.eyeData.os.axis || ''}
                          onChange={(e) => {
                            if (parsedData.eyeData) {
                              setParsedData({
                                ...parsedData,
                                eyeData: {
                                  ...parsedData.eyeData,
                                  os: { ...parsedData.eyeData.os, axis: e.target.value },
                                },
                              });
                            }
                          }}
                          placeholder="90°"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Near Add (ADD)</label>
                        <input
                          type="text"
                          value={parsedData.eyeData.os.add || ''}
                          onChange={(e) => {
                            if (parsedData.eyeData) {
                              setParsedData({
                                ...parsedData,
                                eyeData: {
                                  ...parsedData.eyeData,
                                  os: { ...parsedData.eyeData.os, add: e.target.value },
                                },
                              });
                            }
                          }}
                          placeholder="+1.75"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pupillary Distance */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs max-w-sm">
                  <span className="font-bold text-slate-700">Pupillary Distance (PD):</span>
                  <input
                    type="text"
                    value={parsedData.eyeData.pd || ''}
                    onChange={(e) => {
                      if (parsedData.eyeData) {
                        setParsedData({
                          ...parsedData,
                          eyeData: { ...parsedData.eyeData, pd: e.target.value },
                        });
                      }
                    }}
                    placeholder="63 mm"
                    className="w-24 px-2 py-1 rounded border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>
            )}

            {/* CASE 2: LAB / URINE PARAMETERS VIEW */}
            {(selectedDocType === 'lab_report' || selectedDocType === 'urine_test') &&
              parsedData.labMetrics && (
                <div className="space-y-3">
                  {parsedData.labMetrics.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        No specific laboratory parameters could be isolated from this document. Please review the raw text above or confirm the document category in Step 3.
                      </span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Test Parameter</th>
                          <th className="py-2.5 px-3">Extracted Value</th>
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3">Reference Range</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.labMetrics.map((metric, idx) => (
                          <tr key={metric.id || idx} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{metric.name}</td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={metric.value}
                                onChange={(e) => {
                                  const updated = [...(parsedData.labMetrics || [])];
                                  const target = updated[idx];
                                  if (target) {
                                    target.value = e.target.value;
                                    setParsedData({ ...parsedData, labMetrics: updated });
                                  }
                                }}
                                className="w-20 px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-medium">{metric.unit}</td>
                            <td className="py-2.5 px-3 text-slate-600">{metric.referenceRange}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  metric.status === 'normal'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {metric.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CASE 3: ECG VIEW */}
            {selectedDocType === 'ecg_report' && parsedData.ecgData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <span className="text-slate-500 block">Ventricular Rate</span>
                  <span className="font-extrabold text-sm text-slate-900">
                    {parsedData.ecgData.ventricularRate || 'Normal'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <span className="text-slate-500 block">Rhythm</span>
                  <span className="font-extrabold text-sm text-slate-900">
                    {parsedData.ecgData.rhythm || 'Sinus Rhythm'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <span className="text-slate-500 block">PR Interval</span>
                  <span className="font-extrabold text-sm text-slate-900">
                    {parsedData.ecgData.prInterval || 'Normal'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <span className="text-slate-500 block">QRS Duration</span>
                  <span className="font-extrabold text-sm text-slate-900">
                    {parsedData.ecgData.qrsDuration || 'Normal'}
                  </span>
                </div>
              </div>
            )}

            {/* CASE 4: RADIOLOGY VIEW */}
            {selectedDocType === 'radiology_report' && parsedData.radiologyData && (
              <div className="space-y-2 text-xs">
                <p>
                  <strong>Modality:</strong> {parsedData.radiologyData.modality} •{' '}
                  <strong>Region:</strong> {parsedData.radiologyData.bodyRegion}
                </p>
                {parsedData.radiologyData.findings.length > 0 && (
                  <div>
                    <strong>Findings:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {parsedData.radiologyData.findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* CASE 5: PRESCRIPTION VIEW */}
            {selectedDocType === 'prescription' && parsedData.prescriptionData && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200">
                  <div className="flex items-center gap-2 font-bold text-sm text-teal-900 mb-1">
                    <Pill className="w-5 h-5 text-teal-600" />
                    <span>Clinical Prescription Details &amp; Field Separation</span>
                  </div>
                  <p className="text-xs text-teal-800">
                    Granular patient demographics, doctor qualification, facility address, separated medicine parameters, and consultation questions.
                  </p>
                </div>

                {/* PATIENT DEMOGRAPHICS & ID */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-teal-600" />
                      Patient Information (Isolated Fields)
                    </span>
                    <span className="text-[11px] text-slate-500">Strict Validation</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Patient Name</label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.patientName || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.patientName}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: { ...parsedData.prescriptionData, patientName: e.target.value },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.patientName && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.patientName}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Age</label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.patientAge || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.patientAge}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: { ...parsedData.prescriptionData, patientAge: e.target.value },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.patientAge && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.patientAge}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Gender</label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.patientGender || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.patientGender}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: { ...parsedData.prescriptionData, patientGender: e.target.value },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.patientGender && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.patientGender}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Patient ID / UHID</label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.patientUhid || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.patientUhid}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: { ...parsedData.prescriptionData, patientUhid: e.target.value },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.patientUhid && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.patientUhid}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-teal-600" />
                        Prescription Date
                      </label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.prescriptionDate || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.prescriptionDate}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: { ...parsedData.prescriptionData, prescriptionDate: e.target.value },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.prescriptionDate && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.prescriptionDate}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* DOCTOR & FACILITY */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      Prescribing Physician &amp; Healthcare Facility
                    </span>
                    <span className="text-[11px] text-slate-500">Separated Credentials</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Prescribing Doctor</label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.doctorName || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.doctorName}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: { ...parsedData.prescriptionData, doctorName: e.target.value },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.doctorName && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.doctorName}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Doctor Qualification / Reg No</label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.doctorQualification || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.doctorQualification}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: { ...parsedData.prescriptionData, doctorQualification: e.target.value },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.doctorQualification && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.doctorQualification}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-teal-600" />
                        Hospital / Clinic Name
                      </label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.hospitalOrClinic || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.hospitalOrClinic}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: {
                                ...parsedData.prescriptionData,
                                hospitalOrClinic: e.target.value,
                                clinicOrHospital: e.target.value,
                              },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.hospitalOrClinic && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.hospitalOrClinic}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        Address &amp; Contact Details
                      </label>
                      <input
                        type="text"
                        value={parsedData.prescriptionData.hospitalAddressContact || ''}
                        placeholder={PRESCRIPTION_FALLBACKS.hospitalAddressContact}
                        onChange={(e) => {
                          if (parsedData.prescriptionData) {
                            setParsedData({
                              ...parsedData,
                              prescriptionData: {
                                ...parsedData.prescriptionData,
                                hospitalAddressContact: e.target.value,
                              },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      {!parsedData.prescriptionData.hospitalAddressContact && (
                        <span className="text-[10px] text-amber-700 italic block mt-1">{PRESCRIPTION_FALLBACKS.hospitalAddressContact}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Complaint / Diagnosis & Advice Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <label className="font-bold text-slate-700 block">Complaint / Clinical Notes</label>
                    <textarea
                      rows={2}
                      value={parsedData.prescriptionData.complaintOrDiagnosis || ''}
                      placeholder="Not found in document"
                      onChange={(e) => {
                        if (parsedData.prescriptionData) {
                          setParsedData({
                            ...parsedData,
                            prescriptionData: { ...parsedData.prescriptionData, complaintOrDiagnosis: e.target.value },
                          });
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium bg-white text-slate-900"
                    />
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <label className="font-bold text-slate-700 block">Doctor Advice / Instructions</label>
                    <textarea
                      rows={2}
                      value={parsedData.prescriptionData?.adviceOrInstructions || ''}
                      placeholder="Not found in document"
                      onChange={(e) => {
                        if (parsedData.prescriptionData) {
                          setParsedData({
                            ...parsedData,
                            prescriptionData: { ...parsedData.prescriptionData, adviceOrInstructions: e.target.value },
                          });
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium bg-white text-slate-900"
                    />
                  </div>
                </div>

                {/* Medications List */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-teal-600" />
                        <span>Prescribed Medications ({parsedData.prescriptionData.medications.length})</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Separated medicine name, dosage, form, frequency, timing, food relation, and duration
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (parsedData.prescriptionData) {
                          const newMed: PrescriptionMedication = {
                            id: `med-${Date.now()}`,
                            name: '',
                            dosage: '500mg',
                            dosageForm: 'Tablet',
                            form: 'Tablet',
                            frequency: '1-0-1',
                            timing: 'Morning & Night',
                            foodRelation: 'After food',
                            duration: '5 days',
                            instructions: 'With warm water',
                            verified: true,
                          };
                          setParsedData({
                            ...parsedData,
                            prescriptionData: {
                              ...parsedData.prescriptionData,
                              medications: [...parsedData.prescriptionData.medications, newMed],
                            },
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      + Add Medication
                    </button>
                  </div>

                  {parsedData.prescriptionData.medications.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          {parsedData.prescriptionData.medicationsNotes || 'No specific medications found in document'} (Medications not specified).
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-teal-800">
                        Click "+ Add Medication" to record any prescribed medicine.
                      </span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[760px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                          <tr>
                            <th className="py-2.5 px-2.5">Medicine Name</th>
                            <th className="py-2.5 px-2">Dosage</th>
                            <th className="py-2.5 px-2">Form</th>
                            <th className="py-2.5 px-2">Frequency</th>
                            <th className="py-2.5 px-2">Timing</th>
                            <th className="py-2.5 px-2">Food</th>
                            <th className="py-2.5 px-2">Duration</th>
                            <th className="py-2.5 px-2">Instructions</th>
                            <th className="py-2.5 px-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedData.prescriptionData.medications.map((med, mIdx) => (
                            <tr key={med.id || mIdx}>
                              <td className="py-2 px-2.5">
                                <input
                                  type="text"
                                  value={med.name}
                                  placeholder="Medicine name"
                                  onChange={(e) => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = [...parsedData.prescriptionData.medications];
                                      if (updatedMeds[mIdx]) {
                                        updatedMeds[mIdx].name = e.target.value;
                                        setParsedData({
                                          ...parsedData,
                                          prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                        });
                                      }
                                    }
                                  }}
                                  className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900 bg-white"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={med.dosage || ''}
                                  placeholder="500mg"
                                  onChange={(e) => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = [...parsedData.prescriptionData.medications];
                                      if (updatedMeds[mIdx]) {
                                        updatedMeds[mIdx].dosage = e.target.value;
                                        setParsedData({
                                          ...parsedData,
                                          prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                        });
                                      }
                                    }
                                  }}
                                  className="w-20 px-2 py-1 rounded border border-slate-300 text-slate-900 bg-white"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={med.dosageForm || med.form || ''}
                                  placeholder="Tablet"
                                  onChange={(e) => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = [...parsedData.prescriptionData.medications];
                                      if (updatedMeds[mIdx]) {
                                        updatedMeds[mIdx].dosageForm = e.target.value;
                                        updatedMeds[mIdx].form = e.target.value;
                                        setParsedData({
                                          ...parsedData,
                                          prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                        });
                                      }
                                    }
                                  }}
                                  className="w-20 px-2 py-1 rounded border border-slate-300 text-slate-900 bg-white"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={med.frequency || ''}
                                  placeholder="1-0-1"
                                  onChange={(e) => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = [...parsedData.prescriptionData.medications];
                                      if (updatedMeds[mIdx]) {
                                        updatedMeds[mIdx].frequency = e.target.value;
                                        setParsedData({
                                          ...parsedData,
                                          prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                        });
                                      }
                                    }
                                  }}
                                  className="w-24 px-2 py-1 rounded border border-slate-300 text-slate-900 bg-white"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={med.timing || ''}
                                  placeholder="Morning"
                                  onChange={(e) => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = [...parsedData.prescriptionData.medications];
                                      if (updatedMeds[mIdx]) {
                                        updatedMeds[mIdx].timing = e.target.value;
                                        setParsedData({
                                          ...parsedData,
                                          prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                        });
                                      }
                                    }
                                  }}
                                  className="w-24 px-2 py-1 rounded border border-slate-300 text-slate-900 bg-white"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={med.foodRelation || ''}
                                  placeholder="After food"
                                  onChange={(e) => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = [...parsedData.prescriptionData.medications];
                                      if (updatedMeds[mIdx]) {
                                        updatedMeds[mIdx].foodRelation = e.target.value;
                                        setParsedData({
                                          ...parsedData,
                                          prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                        });
                                      }
                                    }
                                  }}
                                  className="w-24 px-2 py-1 rounded border border-slate-300 text-slate-900 bg-white"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={med.duration || ''}
                                  placeholder="5 days"
                                  onChange={(e) => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = [...parsedData.prescriptionData.medications];
                                      if (updatedMeds[mIdx]) {
                                        updatedMeds[mIdx].duration = e.target.value;
                                        setParsedData({
                                          ...parsedData,
                                          prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                        });
                                      }
                                    }
                                  }}
                                  className="w-20 px-2 py-1 rounded border border-slate-300 text-slate-900 bg-white"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={med.instructions || ''}
                                  placeholder="Instructions"
                                  onChange={(e) => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = [...parsedData.prescriptionData.medications];
                                      if (updatedMeds[mIdx]) {
                                        updatedMeds[mIdx].instructions = e.target.value;
                                        setParsedData({
                                          ...parsedData,
                                          prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                        });
                                      }
                                    }
                                  }}
                                  className="w-28 px-2 py-1 rounded border border-slate-300 text-slate-900 bg-white"
                                />
                              </td>
                              <td className="py-2 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (parsedData.prescriptionData) {
                                      const updatedMeds = parsedData.prescriptionData.medications.filter((_, idx) => idx !== mIdx);
                                      setParsedData({
                                        ...parsedData,
                                        prescriptionData: { ...parsedData.prescriptionData, medications: updatedMeds },
                                      });
                                    }
                                  }}
                                  className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* DOCTOR CONSULTATION QUESTIONS PREVIEW */}
                {parsedData.prescriptionData.doctorQuestions && parsedData.prescriptionData.doctorQuestions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-2">
                    <span className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-teal-700" />
                      Doctor Consultation Questions Preview (Grounded in Prescription)
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700 pl-1">
                      {parsedData.prescriptionData.doctorQuestions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-teal-200/70">
                          <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-slate-800">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* CASE 6: UNSUPPORTED / UNCONFIRMED DOCUMENT ALERT */}
            {selectedDocType === 'unsupported' && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span>Document Type Unconfirmed</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Optical text recognition could not reliably identify the medical specialty of this document. Please review the original document preview above and confirm the matching document category in Step 3 (e.g. Medication Prescription, Blood Panel, Eye Prescription, ECG, etc.) to view and verify the clinical fields.
                </p>
              </div>
            )}

            {/* STEP 5: USER VERIFICATION CHECKBOX */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVerifiedByUser}
                  onChange={(e) => setIsVerifiedByUser(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">
                  I have checked and confirmed these values against the physical medical sheet.
                </span>
              </label>

              <div className="flex flex-col sm:items-end gap-1">
                <button
                  onClick={handleRequestAi}
                  disabled={!isVerifiedByUser || isAiLoading || selectedDocType === 'unsupported'}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
                    !isVerifiedByUser || isAiLoading || selectedDocType === 'unsupported'
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-101'
                  }`}
                >
                  {isAiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting to Server AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Step 6 • Request Clinical AI Explanation</span>
                    </>
                  )}
                </button>
                {selectedDocType === 'unsupported' && (
                  <span className="text-[11px] text-amber-700 font-medium">
                    * Confirm document type in Step 3 to proceed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* STEP 6: REAL AI EXPLANATION RESULTS / MISSING KEY NOTICE */}
          {aiResult && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block mb-1">
                    Step 6 • Verified Facts &amp; Clinical Explanation
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Clinical Synthesis &amp; Medical Insights
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Engine: <strong className="text-slate-700">{aiResult.modelName || 'MediMentor Grounded Engine'}</strong>
                  </p>
                </div>

                {aiResult.isRateLimitFallback ? (
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5"
                    title={aiResult.fallbackReason || 'Google Gemini rate-limit fallback active'}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Grounded Fail-Safe Engine
                  </span>
                ) : aiResult.configured ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Live Gemini Cloud Connected
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-600" /> Local Mode (No Server Key)
                  </span>
                )}
              </div>

              {/* Verified Facts From Document */}
              <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200 space-y-2">
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700" />
                  Facts Extracted Directly From Document (Verified Ground Truth)
                </h4>
                <ul className="space-y-1 text-xs text-teal-950 pl-2">
                  {aiResult.factsFromDocument.map((fact, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Doctor Consultation Questions */}
              {(aiResult.doctorQuestions || parsedData.prescriptionData?.doctorQuestions) && (
                <div className="p-4 rounded-2xl bg-white border border-teal-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-teal-600" />
                      Grounded Questions for Your Doctor Consultation
                    </h4>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                      Grounded in Document
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Take these clinically targeted questions to your upcoming physician appointment:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700 pl-1">
                    {(aiResult.doctorQuestions || parsedData.prescriptionData?.doctorQuestions || []).map((q, qIdx) => (
                      <li key={qIdx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <span className="font-medium text-slate-800">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Explanation OR Missing Key Advisory */}
              {aiResult.configured && aiResult.aiExplanation ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    AI Educational Explanation ({language.toUpperCase()})
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {aiResult.aiExplanation}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <Info className="w-4 h-4 text-amber-700" />
                    <span>AI Service Configuration Status</span>
                  </div>
                  <p className="leading-relaxed">
                    {aiResult.error || 'Server-side GEMINI_API_KEY is not configured.'}
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {aiResult.setupInstructions ||
                      'Configure GEMINI_API_KEY in your Vercel Project Settings or local .env file. The application strictly presents verified document facts without fabricating mock responses.'}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/settings')}
                      className="text-xs font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer"
                    >
                      Configure Personal Gemini API Key in Settings →
                    </button>
                  </div>
                </div>
              )}

              {/* Clinical Considerations & Uncertainty */}
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Medical Safety &amp; Uncertainty Disclosure:</p>
                <p>
                  • Only verified facts from your uploaded document are recorded. MediMentor AI does not substitute for a clinical consultation.
                </p>
              </div>

              {/* STEP 7: SAVE RECORD BUTTON */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveToRecords}
                  disabled={selectedDocType === 'unsupported'}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                    selectedDocType === 'unsupported'
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-101'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Step 7 • Save Verified Record to Health History</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 7 SUCCESS STATE */}
          {activeStep === 7 && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 sm:p-8 text-emerald-950 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">
                    Medical Record Successfully Verified &amp; Saved!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your document has been verified with genuine OCR text extraction and committed to your health history.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/timeline')}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs cursor-pointer"
                >
                  View in Health Timeline →
                </button>
                <button
                  onClick={() => navigate('/summary')}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
                >
                  View Health Summary
                </button>
                <button
                  onClick={resetPipeline}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Upload Another Document
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
