import React, { createContext, useContext, useState, useEffect } from 'react';
import type { MedicalReport, PatientProfile } from '../types/report';
import { MOCK_REPORTS, INITIAL_PATIENT_PROFILE, AVAILABLE_PATIENT_PROFILES } from '../data/mockReports';

/**
 * Deduplicate records by unique ID and verified filename + category/type signature
 */
export function deduplicateReports(reportsList: MedicalReport[]): MedicalReport[] {
  const seen = new Set<string>();
  const deduplicated: MedicalReport[] = [];

  for (const report of reportsList) {
    const fileKey =
      report.fileName && report.fileName !== 'Document.pdf'
        ? `file:${report.fileName.toLowerCase().trim()}_${report.documentType || report.category}`
        : null;

    const uniqueKey = fileKey || `id:${report.id}`;

    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      deduplicated.push(report);
    }
  }

  return deduplicated;
}

interface ReportsContextType {
  reports: MedicalReport[];
  activeReportId: string;
  setActiveReportId: (id: string) => void;
  profile: PatientProfile;
  availableProfiles: PatientProfile[];
  switchProfile: (profileId: string) => void;
  updateProfile: (updates: Partial<PatientProfile>) => void;
  verifyMetric: (reportId: string, metricId: string, verified: boolean) => void;
  updateMetricValue: (reportId: string, metricId: string, value: string, notes?: string) => void;
  verifyAllReportMetrics: (reportId: string) => void;
  saveVerifiedReport: (reportId: string) => void;
  updateReport: (reportId: string, updates: Partial<MedicalReport>) => void;
  addReport: (report: MedicalReport) => void;
  deleteReport: (reportId: string) => void;
  resetToDemoData: () => void;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

const ACTIVE_USER_KEY = 'medimentor_active_user_id';
const getUserReportsKey = (userId: string) => `medimentor_reports_${userId}`;
const getUserProfileKey = (userId: string) => `medimentor_profile_${userId}`;

export const ReportsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_USER_KEY) || INITIAL_PATIENT_PROFILE.id;
    } catch {
      return INITIAL_PATIENT_PROFILE.id;
    }
  });

  const [availableProfiles] = useState<PatientProfile[]>(AVAILABLE_PATIENT_PROFILES);

  const [profile, setProfile] = useState<PatientProfile>(() => {
    try {
      const activeId = localStorage.getItem(ACTIVE_USER_KEY) || INITIAL_PATIENT_PROFILE.id;
      const saved = localStorage.getItem(getUserProfileKey(activeId));
      if (saved) return JSON.parse(saved);
      const matched = AVAILABLE_PATIENT_PROFILES.find((p) => p.id === activeId);
      if (matched) return matched;
    } catch {
      // ignore
    }
    return INITIAL_PATIENT_PROFILE;
  });

  const [reports, setReports] = useState<MedicalReport[]>(() => {
    try {
      const activeId = localStorage.getItem(ACTIVE_USER_KEY) || INITIAL_PATIENT_PROFILE.id;
      const saved = localStorage.getItem(getUserReportsKey(activeId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return deduplicateReports(parsed);
      }
      // Only Arjun starts with demo mock reports; other profiles start empty for privacy isolation
      if (activeId === INITIAL_PATIENT_PROFILE.id) return MOCK_REPORTS;
      return [];
    } catch {
      // ignore
    }
    return MOCK_REPORTS;
  });

  const [activeReportId, setActiveReportId] = useState<string>('rep-renal-2026');

  // Sync active profile ID
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_USER_KEY, activeProfileId);
    } catch {
      // ignore
    }
  }, [activeProfileId]);

  // Sync isolated reports for current active user
  useEffect(() => {
    try {
      localStorage.setItem(getUserReportsKey(activeProfileId), JSON.stringify(reports));
    } catch {
      // ignore
    }
  }, [reports, activeProfileId]);

  // Sync isolated profile for current active user
  useEffect(() => {
    try {
      localStorage.setItem(getUserProfileKey(activeProfileId), JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile, activeProfileId]);

  // Switch active patient profile with complete record isolation
  const switchProfile = (newProfileId: string) => {
    const targetProfile =
      availableProfiles.find((p) => p.id === newProfileId) || INITIAL_PATIENT_PROFILE;
    setActiveProfileId(targetProfile.id);
    setProfile(targetProfile);

    // Load isolated reports for target user
    try {
      const savedReports = localStorage.getItem(getUserReportsKey(targetProfile.id));
      if (savedReports) {
        const parsed = JSON.parse(savedReports);
        if (Array.isArray(parsed)) {
          const deduped = deduplicateReports(parsed);
          setReports(deduped);
          if (deduped.length > 0) setActiveReportId(deduped[0].id);
          return;
        }
      }
    } catch {
      // ignore
    }

    if (targetProfile.id === INITIAL_PATIENT_PROFILE.id) {
      setReports(MOCK_REPORTS);
      setActiveReportId('rep-renal-2026');
    } else {
      setReports([]);
      setActiveReportId('');
    }
  };

  const updateProfile = (updates: Partial<PatientProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const verifyMetric = (reportId: string, metricId: string, verified: boolean) => {
    setReports((prev) =>
      prev.map((rep) => {
        if (rep.id !== reportId) return rep;
        return {
          ...rep,
          metrics: rep.metrics.map((m) => (m.id === metricId ? { ...m, verified } : m)),
        };
      })
    );
  };

  const updateMetricValue = (
    reportId: string,
    metricId: string,
    value: string,
    notes?: string
  ) => {
    setReports((prev) =>
      prev.map((rep) => {
        if (rep.id !== reportId) return rep;
        return {
          ...rep,
          metrics: rep.metrics.map((m) =>
            m.id === metricId
              ? {
                  ...m,
                  value,
                  notes: notes !== undefined ? notes : m.notes,
                }
              : m
          ),
        };
      })
    );
  };

  const verifyAllReportMetrics = (reportId: string) => {
    setReports((prev) =>
      prev.map((rep) => {
        if (rep.id !== reportId) return rep;
        return {
          ...rep,
          metrics: rep.metrics.map((m) => ({ ...m, verified: true })),
        };
      })
    );
  };

  const saveVerifiedReport = (reportId: string) => {
    setReports((prev) =>
      prev.map((rep) => {
        if (rep.id !== reportId) return rep;
        return {
          ...rep,
          isVerified: true,
          metrics: rep.metrics.map((m) => ({ ...m, verified: true })),
        };
      })
    );
  };

  const updateReport = (reportId: string, updates: Partial<MedicalReport>) => {
    setReports((prev) =>
      prev.map((rep) => (rep.id === reportId ? { ...rep, ...updates } : rep))
    );
  };

  const addReport = (newReport: MedicalReport) => {
    setReports((prev) => {
      // Check if an identical file or same ID already exists
      const existingIndex = prev.findIndex(
        (r) =>
          r.id === newReport.id ||
          (newReport.fileName &&
            newReport.fileName !== 'Document.pdf' &&
            r.fileName?.toLowerCase().trim() === newReport.fileName.toLowerCase().trim() &&
            (r.documentType === newReport.documentType || r.category === newReport.category))
      );

      if (existingIndex >= 0) {
        // Update the existing record in place instead of creating a duplicate timeline entry
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...newReport,
          id: updated[existingIndex].id, // preserve stable record ID
        };
        return updated;
      }

      return [newReport, ...prev];
    });
    setActiveReportId(newReport.id);
  };

  const deleteReport = (reportId: string) => {
    setReports((prev) => prev.filter((rep) => rep.id !== reportId));
  };

  const resetToDemoData = () => {
    setActiveProfileId(INITIAL_PATIENT_PROFILE.id);
    setReports(MOCK_REPORTS);
    setProfile(INITIAL_PATIENT_PROFILE);
    setActiveReportId('rep-renal-2026');
    try {
      localStorage.removeItem(getUserReportsKey(INITIAL_PATIENT_PROFILE.id));
      localStorage.removeItem(getUserProfileKey(INITIAL_PATIENT_PROFILE.id));
      localStorage.removeItem(ACTIVE_USER_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <ReportsContext.Provider
      value={{
        reports,
        activeReportId,
        setActiveReportId,
        profile,
        availableProfiles,
        switchProfile,
        updateProfile,
        verifyMetric,
        updateMetricValue,
        verifyAllReportMetrics,
        saveVerifiedReport,
        updateReport,
        addReport,
        deleteReport,
        resetToDemoData,
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
};

export const useReports = (): ReportsContextType => {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
};
