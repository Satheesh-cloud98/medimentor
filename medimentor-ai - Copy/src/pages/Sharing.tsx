import React, { useState } from 'react';
import {
  Share2,
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  Copy,
  UserCheck,
  FileText,
} from 'lucide-react';
import { MOCK_CONSENT_SHARES } from '../data/mockJourneyData';
import type { ConsentShareItem } from '../types/journey';
import { useReports } from '../context/ReportsContext';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

export const Sharing: React.FC = () => {
  const { t } = useLanguage();
  const { reports } = useReports();
  const [shares, setShares] = useState<ConsentShareItem[]>(MOCK_CONSENT_SHARES);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [recipient, setRecipient] = useState('Dr. Anand Sharma (Cardiology)');
  const [purpose, setPurpose] = useState('Second Opinion Consultation');
  const [validity, setValidity] = useState<'24 Hours' | '7 Days' | '30 Days'>('24 Hours');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>(reports.map((r) => r.id));

  const handleCreateShare = (e: React.FormEvent) => {
    e.preventDefault();
    const token = `SEC-${Math.floor(1000 + Math.random() * 9000)}-${validity === '24 Hours' ? '24H' : 'SHARE'}`;

    const newShare: ConsentShareItem = {
      id: `req-${Date.now()}`,
      recipient,
      recipientRole: 'Consulting Physician',
      purpose,
      documents: reports
        .filter((r) => selectedReportIds.includes(r.id))
        .map((r) => `${r.title} (${r.formattedDate || r.date})`),
      validity,
      createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      expiresAt: new Date(Date.now() + (validity === '24 Hours' ? 86400000 : 7 * 86400000)).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      status: 'active',
      accessCode: token,
    };

    setShares([newShare, ...shares]);
    setShowCreateModal(false);
  };

  const handleRevoke = (id: string) => {
    setShares(shares.map((s) => (s.id === id ? { ...s, status: 'revoked' as const } : s)));
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Share2 className="w-7 h-7 text-teal-600" />
              {t('navSharing') || 'Consent-Based Health Record Sharing'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Grant time-limited, encrypted access to chosen medical reports for second opinions or referral reviews.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Share Grant</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900">
          <p className="font-bold">ABDM Consent Architecture & Dual Authorization</p>
          <p className="mt-0.5 leading-relaxed text-teal-800">
            Records are shared via ephemeral cryptographic tokens compliant with National Health Authority standards.
            Access automatically expires upon timer completion, or can be instantly revoked at any moment.
          </p>
        </div>
      </div>

      {/* Active Shares List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>Active & Historical Consent Grants</span>
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
            {shares.length}
          </span>
        </h2>

        {shares.map((share) => (
          <div
            key={share.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-teal-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  {share.recipient}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                    share.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : share.status === 'revoked'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {share.status}
                </span>
                <span className="text-xs text-slate-400 font-mono">Token: {share.accessCode}</span>
              </div>

              <p className="text-xs text-slate-600">
                <strong>Purpose:</strong> {share.purpose}
              </p>

              <div>
                <p className="text-xs text-slate-500 font-medium">Permitted Records ({share.documents.length}):</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {share.documents.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200"
                    >
                      <FileText className="w-3 h-3 text-slate-500" />
                      {doc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                <span>Created: {share.createdAt}</span>
                <span>Expires: {share.expiresAt}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
              <button
                onClick={() => copyToClipboard(share.accessCode)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedCode === share.accessCode ? 'Copied Token!' : 'Copy Token'}</span>
              </button>

              {share.status === 'active' && (
                <button
                  onClick={() => handleRevoke(share.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Grant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-teal-600" />
              Generate Consent Sharing Grant
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select recipient clinician or laboratory and specify authorization duration.
            </p>

            <form onSubmit={handleCreateShare} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Clinician / Facility</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Purpose</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Second Opinion Consultation">Second Opinion Consultation</option>
                  <option value="Specialist Referral Review">Specialist Referral Review</option>
                  <option value="Pre-Operative Assessment">Pre-Operative Assessment</option>
                  <option value="Laboratory Cross-Validation">Laboratory Cross-Validation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Validity Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['24 Hours', '7 Days', '30 Days'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValidity(v)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        validity === v
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Permitted Reports</label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
                  {reports.map((report) => (
                    <label key={report.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedReportIds.includes(report.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReportIds([...selectedReportIds, report.id]);
                          } else {
                            setSelectedReportIds(selectedReportIds.filter((id) => id !== report.id));
                          }
                        }}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>
                        {report.title} ({report.formattedDate || report.date})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedReportIds.length === 0}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  Authorize & Issue Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
