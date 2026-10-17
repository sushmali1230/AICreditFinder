import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Search, Filter, RefreshCw } from 'lucide-react';
import { AuditLog } from '../../types';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await api.audit.list({ limit: 100 });
      setLogs(data.logs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    return filterAction === 'ALL' || l.action.includes(filterAction);
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Regulatory Audit & Compliance Trail</h2>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              Immutable Log
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically timestamped audit records tracking document uploads, assessment versions, policy edits, and loan sanction sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            <option value="LOAN">Loan Decisions (Approve/Reject)</option>
            <option value="ASSESSMENT">Assessment Executions</option>
            <option value="STATEMENT">Statement Uploads</option>
            <option value="ITR">ITR Ingestion</option>
            <option value="POLICY">Policy Updates</option>
          </select>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 border border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">User & Role</th>
                <th className="px-5 py-3.5">Audit Action</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">Activity Details</th>
                <th className="px-5 py-3.5 text-right">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 italic">
                    No audit records found matching selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{log.userName}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 mt-0.5 inline-block">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action.includes('APPROVED')
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : log.action.includes('REJECTED')
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : log.action.includes('ASSESSMENT')
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-300">
                        {log.entityType} ({log.entityId.slice(0, 8)}...)
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300 max-w-md">
                      {log.details}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
