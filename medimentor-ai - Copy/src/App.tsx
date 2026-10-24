import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ReportsProvider } from './context/ReportsContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { UploadRecords } from './pages/UploadRecords';
import { ReportVerification } from './pages/ReportVerification';
import { HealthSummary } from './pages/HealthSummary';
import { HealthTimeline } from './pages/HealthTimeline';
import { Settings } from './pages/Settings';
import { VerifiHealthChat } from './pages/VerifiHealthChat';
import { Prescriptions } from './pages/Prescriptions';
import { Appointments } from './pages/Appointments';
import { GovernmentSchemes } from './pages/GovernmentSchemes';
import { Sharing } from './pages/Sharing';
import { ReportComparison } from './pages/ReportComparison';
import { FhirValidation } from './pages/FhirValidation';
import { FhirExchangeDemo } from './pages/FhirExchangeDemo';
import { AuditLog } from './pages/AuditLog';
import { ProviderPortal } from './pages/ProviderPortal';

export function App() {
  return (
    <LanguageProvider>
      <ReportsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="upload" element={<UploadRecords />} />
              <Route path="verify" element={<ReportVerification />} />
              <Route path="verify/:id" element={<ReportVerification />} />
              <Route path="summary" element={<HealthSummary />} />
              <Route path="timeline" element={<HealthTimeline />} />
              <Route path="chat" element={<VerifiHealthChat />} />
              <Route path="prescriptions" element={<Prescriptions />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="government-schemes" element={<GovernmentSchemes />} />
              <Route path="sharing" element={<Sharing />} />
              <Route path="compare" element={<ReportComparison />} />
              <Route path="fhir" element={<FhirValidation />} />
              <Route path="network/exchange-demo" element={<FhirExchangeDemo />} />
              <Route path="network/audit-log" element={<AuditLog />} />
              <Route path="network/access-requests" element={<Sharing />} />
              <Route path="provider-portal" element={<ProviderPortal />} />
              <Route path="provider-portal/register" element={<ProviderPortal />} />
              <Route path="provider-portal/verification" element={<ProviderPortal />} />
              <Route path="settings" element={<Settings />} />

              {/* Seamless Navigation Aliases & Redirects */}
              <Route path="records" element={<Navigate to="/summary" replace />} />
              <Route path="assistant" element={<Navigate to="/chat" replace />} />
              <Route path="consent" element={<Navigate to="/sharing" replace />} />
              <Route path="report-comparison" element={<Navigate to="/compare" replace />} />
              <Route path="abha" element={<Navigate to="/government-schemes" replace />} />
              <Route path="pm-jay" element={<Navigate to="/government-schemes" replace />} />
              <Route path="sign-in" element={<Navigate to="/settings" replace />} />
              <Route path="signin" element={<Navigate to="/settings" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ReportsProvider>
    </LanguageProvider>
  );
}

export default App;
