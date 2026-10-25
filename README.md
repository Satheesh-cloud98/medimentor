# MediMentor AI - Clinical Health Copilot & Records Intelligence

MediMentor AI is an intelligent, responsive multilingual healthcare dashboard designed to help patients and clinicians track laboratory records, verify extracted biometric parameters with human-in-the-loop review, and observe longitudinal health trends.

---

## 🌟 Key Features

1. **Medical Teal & Clean White Design**:
   - Modern, accessible color palette built with Tailwind CSS.
   - Clinical status badges: Emerald (Normal), Amber (Borderline / Attention), Rose (Elevated / High).
   - Responsive layouts optimized for desktops, tablets, and mobile screens.

2. **13 Indian Languages + English Full UI Translation**:
   - When the language selector is switched, the **entire application interface changes dynamically**, including all navigation items, metrics, status badges, buttons, and safety disclaimers.
   - Supported Languages:
     - **English**
     - **Tamil (தமிழ்)**
     - **Hindi (हिन्दी)**
     - **Telugu (తెలుగు)**
     - **Kannada (ಕನ್ನಡ)**
     - **Malayalam (മലയാളം)**
     - **Bengali (বাংলা)**
     - **Marathi (मराठी)**
     - **Gujarati (ગુજરાતી)**
     - **Punjabi (ਪੰਜਾਬੀ)**
     - **Urdu (اردو)** — with automatic RTL (Right-to-Left) rendering
     - **Odia (ଓଡ଼ିଆ)**
     - **Assamese (অসমীয়া)**

3. **6 Core Healthcare Pages**:
   - **Dashboard**: High-level patient vitals index, quick action cards, flagged metrics counter, and recent reports.
   - **Upload Medical Records**: Document dropzone (PDF/JPG/PNG), patient demographic inputs, preloaded sample report buttons, and simulated extraction pipeline.
   - **Report Verification**: Human-in-the-loop review interface with parameter editing, confidence score indicators, and approval checklists.
   - **Health Summary**: Organ system breakdown (Cardiovascular, Metabolic, Hematological, Renal) with clinical takeaways and physician discussion points.
   - **Health Timeline**: Chronological history with categorical filters and longitudinal trends for HbA1c and Total Cholesterol over 12 months.
   - **Settings**: Complete 13-language selector, patient profile editor, demo data reset, and local sandbox privacy notices.

4. **Transparent Demo Data Protocols**:
   - Clearly labeled with prominent **DEMO DATA** badges.
   - No fabricated claims of OCR or AI success; the interface explicitly states that extractions are demonstration simulations pending backend service integration.

---

## 🏗️ Project Architecture

```
medimentor-ai/
├── public/                 # Static assets and icons
├── src/
│   ├── components/         # Reusable clinical UI components
│   │   ├── DemoBadge.tsx          # Localized demo warning badge
│   │   ├── Header.tsx             # Sticky header with 13-lang dropdown
│   │   ├── Layout.tsx             # Responsive shell with sidebar & banner
│   │   ├── MedicalDisclaimer.tsx  # Patient safety notice
│   │   ├── MetricCard.tsx         # Lab biomarker status card
│   │   └── Sidebar.tsx            # Navigation with localized labels & badge counters
│   ├── context/            # React state providers
│   │   ├── LanguageContext.tsx    # Multi-language provider with RTL support
│   │   └── ReportsContext.tsx     # Medical records and verification state
│   ├── data/
│   │   └── mockReports.ts         # Structured sample diagnostic records
│   ├── pages/              # 6 Core application pages
│   │   ├── Dashboard.tsx          # Main clinical dashboard
│   │   ├── HealthSummary.tsx      # Organ systems & doctor questions
│   │   ├── HealthTimeline.tsx     # Chronological test trends
│   │   ├── ReportVerification.tsx # Human-in-the-loop verification
│   │   ├── Settings.tsx           # Language & profile settings
│   │   └── UploadRecords.tsx      # Ingestion & simulated pipeline
│   ├── translations/       # 13 Language translation dictionaries
│   │   ├── en.ts, ta.ts, hi.ts, te.ts, kn.ts, ml.ts, bn.ts, mr.ts, gu.ts, pa.ts, ur.ts, or.ts, as.ts
│   │   ├── types.ts               # Translation keys interface
│   │   └── index.ts               # Type-safe lookup and fallback
│   ├── types/              # Clean TypeScript models
│   │   ├── language.ts            # Supported language types and metadata
│   │   └── report.ts              # MedicalMetric, MedicalReport, PatientProfile
│   ├── App.tsx             # Root router configuration
│   ├── index.css           # Tailwind CSS imports & styles
│   └── main.tsx            # Application entrypoint
├── package.json            # Scripts & dependencies
├── tsconfig.json           # Strict TypeScript configuration
└── vite.config.ts          # Vite build configuration with React & Tailwind
```

---

## 🚀 How to Run the Application

### Prerequisites
- **Node.js** (v18 or newer; v24 installed)
- On Windows PowerShell, use `npm.cmd` if `.ps1` execution scripts are disabled.

### 1. Navigate to the project directory:
```powershell
cd c:\Users\Student\Downloads\medimentor-ai
```

### 2. Install dependencies (already installed):
```powershell
npm.cmd install
```

### 3. Start the development server:
```powershell
npm.cmd run dev
```
Open your browser at: **`http://localhost:5173`**

### 4. Build for production:
```powershell
npm.cmd run build
```
This performs full TypeScript verification (`tsc -b`) and generates optimized production assets in `dist/`.

### 5. Preview production build:
```powershell
npm.cmd run preview
```
