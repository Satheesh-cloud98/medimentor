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
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ReportsProvider>
    </LanguageProvider>
  );
}

export default App;
