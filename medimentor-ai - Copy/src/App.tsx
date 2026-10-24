import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ReportsProvider } from './context/ReportsContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { Auth } from './pages/Auth';
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
            {/* Public Landing Home Page */}
            <Route path="/" element={<HomePage />} />

            {/* Authentication & Account Creation Pages */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/sign-in" element={<Auth />} />
            <Route path="/signin" element={<Auth />} />
            <Route path="/create-account" element={<Auth />} />
            <Route path="/register" element={<Auth />} />

            {/* Provider Network & Clinical Facilities (Accessible without Patient Login) */}
            <Route element={<Layout />}>
              <Route path="provider-portal" element={<ProviderPortal />} />
              <Route path="provider-portal/register" element={<ProviderPortal />} />
              <Route path="provider-portal/verification" element={<ProviderPortal />} />
            </Route>

            {/* Protected Patient Clinical Health Portal */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
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
              <Route path="settings" element={<Settings />} />

              {/* Seamless Navigation Aliases & Redirects */}
              <Route path="records" element={<Navigate to="/summary" replace />} />
              <Route path="assistant" element={<Navigate to="/chat" replace />} />
              <Route path="consent" element={<Navigate to="/sharing" replace />} />
              <Route path="report-comparison" element={<Navigate to="/compare" replace />} />
              <Route path="abha" element={<Navigate to="/government-schemes" replace />} />
              <Route path="pm-jay" element={<Navigate to="/government-schemes" replace />} />
            </Route>

            {/* Fallback to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ReportsProvider>
    </LanguageProvider>
  );
}

export default App;
