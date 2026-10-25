import React, { useState } from 'react';
import {
  ShieldAlert,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Lock,
  Clock,
} from 'lucide-react';
import { MOCK_AUDIT_LOGS } from '../data/mockJourneyData';
import type { AuditLogEntry } from '../types/journey';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

export const AuditLog: React.FC = () => {
  const { t } = useLanguage();
  const [logs] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUCCESS' | 'DENIED' | 'REVOKED'>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesQuery =
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const exportLogsAsJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medimentor-security-audit-trail-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-teal-600" />
              {t('navAuditLog') || 'Security & Consent Audit Trail'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable clinical access logs, consent authorization events, and unauthorized access interception records.
          </p>
        </div>

        <button
          onClick={exportLogsAsJson}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Trail (JSON)</span>
        </button>
      </div>

      {/* Security Status Box */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Cryptographically Tamper-Evident Ledger</h3>
            <p className="text-xs text-slate-500">
              SHA-256 sequential block hashes verify that zero historical audit records have been altered or deleted.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
          VERIFIED UNCOMPROMISED
        </span>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search actor, action, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
          {(['all', 'SUCCESS', 'DENIED', 'REVOKED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === s ? 'bg-teal-100 text-teal-800 font-bold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource Target</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Network Channel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-sans">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.timestamp}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-sans font-medium text-slate-900">
                    <div>{log.actor}</div>
                    <div className="text-[11px] text-slate-400">{log.role}</div>
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-800">{log.action}</td>

                  <td className="py-3 px-4 text-teal-700 truncate max-w-xs">{log.resource}</td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log.status === 'DENIED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {log.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                      {log.status === 'DENIED' && <XCircle className="w-3 h-3" />}
                      {log.status === 'REVOKED' && <AlertTriangle className="w-3 h-3" />}
                      {log.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-500 font-sans text-[11px]">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
