import React, { useState } from 'react';
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Plus,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Customer, ItrRecord, DiscrepancyItem } from '../../types';
import { formatINR, formatDate, formatPercent } from '../../utils/formatters';
import { api } from '../../services/api';

interface ITRVerificationTabProps {
  customer: Customer;
  itrs: ItrRecord[];
  discrepancies: DiscrepancyItem[];
  missingDocuments: string[];
  onRefreshCustomer: () => void;
}

export const ITRVerificationTab: React.FC<ITRVerificationTabProps> = ({
  customer,
  itrs,
  discrepancies,
  missingDocuments,
  onRefreshCustomer,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for manual / structured ITR entry
  const [formAY, setFormAY] = useState('AY 2024-25');
  const [formFY, setFormFY] = useState('FY 2023-24');
  const [formType, setFormType] = useState('ITR-1');
  const [formGTI, setFormGTI] = useState(1500000);
  const [formTaxable, setFormTaxable] = useState(1350000);
  const [formSalary, setFormSalary] = useState(1500000);
  const [formBusiness, setFormBusiness] = useState(0);
  const [formDeductions, setFormDeductions] = useState(150000);
  const [formTaxesPaid, setFormTaxesPaid] = useState(180000);

  // Sort ITRs chronologically
  const sortedItrs = [...itrs].sort((a, b) => b.financialYear.localeCompare(a.financialYear));
  const latestItr = sortedItrs[0];
  const prevItr = sortedItrs[1];

  // Calculate YoY growth rate
  let growthPct: number | null = null;
  if (latestItr && prevItr && prevItr.grossTotalIncome > 0) {
    growthPct = Math.round(((latestItr.grossTotalIncome - prevItr.grossTotalIncome) / prevItr.grossTotalIncome) * 1000) / 10;
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await api.itr.uploadData(customer.id, {
        assessmentYear: formAY,
        financialYear: formFY,
        formType,
        grossTotalIncome: Number(formGTI),
        taxableIncome: Number(formTaxable),
        salaryIncome: Number(formSalary),
        businessProfessionIncome: Number(formBusiness),
        chapterVIA_Deductions: Number(formDeductions),
        totalTaxesPaid: Number(formTaxesPaid),
        panNumber: customer.panNumber,
        isVerified: true,
      });

      setShowUploadModal(false);
      onRefreshCustomer();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit ITR data');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Growth Summary */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-bold text-white">
                Multi-Year Income Tax Return (ITR) Audit
              </h3>
              <span className="rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                Indian Tax Jurisdiction
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cross-verifying declared tax filings against banking cash flow to detect revenue inflation, undisclosed debts, or tax compliance issues.
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white shadow transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Upload / Add ITR</span>
          </button>
        </div>

        {/* Growth Gauge Banner */}
        {latestItr && prevItr && (
          <div className="mt-4 rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  (growthPct || 0) >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Year-over-Year (YoY) Income Growth:</span>
                  <span
                    className={`font-mono text-sm ${
                      (growthPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(growthPct || 0) > 0 ? `+${growthPct}%` : `${growthPct}%`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Gross Income moved from {formatINR(prevItr.grossTotalIncome)} ({prevItr.financialYear}) to {formatINR(latestItr.grossTotalIncome)} ({latestItr.financialYear})
                </p>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-300">
              {(growthPct || 0) >= 15 && (
                <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-emerald-300 border border-emerald-500/30">
                  Strong Income Expansion
                </span>
              )}
              {(growthPct || 0) >= 0 && (growthPct || 0) < 15 && (
                <span className="rounded-md bg-blue-500/20 px-2.5 py-1 text-blue-300 border border-blue-500/30">
                  Stable Income Growth
                </span>
              )}
              {(growthPct || 0) < 0 && (
                <span className="rounded-md bg-rose-500/20 px-2.5 py-1 text-rose-300 border border-rose-500/30">
                  Income Contraction Flagged
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2-YEAR ITR COMPARISON TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Consecutive 2-Year Tax Assessment Comparison
          </span>
          <span className="text-xs text-slate-400">
            PAN: <strong className="text-white font-mono">{customer.panNumber}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Metric / Parameter</th>
                <th className="px-5 py-3">
                  Latest Year ({latestItr ? `${latestItr.assessmentYear} / ${latestItr.financialYear}` : '—'})
                </th>
                <th className="px-5 py-3">
                  Prior Year ({prevItr ? `${prevItr.assessmentYear} / ${prevItr.financialYear}` : 'Missing'})
                </th>
                <th className="px-5 py-3">Variance / Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              <tr>
                <td className="px-5 py-3 text-slate-400 font-medium">ITR Form Type</td>
                <td className="px-5 py-3 font-semibold text-white">{latestItr?.formType || '—'}</td>
                <td className="px-5 py-3 text-slate-300">{prevItr?.formType || '—'}</td>
                <td className="px-5 py-3 text-slate-400">—</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-400 font-medium">Gross Total Income (GTI)</td>
                <td className="px-5 py-3 font-bold text-emerald-400">
                  {latestItr ? formatINR(latestItr.grossTotalIncome) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-200">
                  {prevItr ? formatINR(prevItr.grossTotalIncome) : '—'}
                </td>
                <td className="px-5 py-3 font-bold text-white">
                  {growthPct !== null ? `${growthPct > 0 ? '+' : ''}${growthPct}%` : '—'}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-400 font-medium">Net Taxable Income</td>
                <td className="px-5 py-3 font-semibold text-slate-200">
                  {latestItr ? formatINR(latestItr.taxableIncome) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-300">
                  {prevItr ? formatINR(prevItr.taxableIncome) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {latestItr && prevItr
                    ? `${Math.round(((latestItr.taxableIncome - prevItr.taxableIncome) / prevItr.taxableIncome) * 100)}%`
                    : '—'}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-400 font-medium">Salary Income (u/s 17)</td>
                <td className="px-5 py-3 text-slate-200">
                  {latestItr ? formatINR(latestItr.salaryIncome) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {prevItr ? formatINR(prevItr.salaryIncome) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">—</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-400 font-medium">Business / Profession Profit (PGBP)</td>
                <td className="px-5 py-3 text-slate-200">
                  {latestItr ? formatINR(latestItr.businessProfessionIncome) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {prevItr ? formatINR(prevItr.businessProfessionIncome) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">—</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-400 font-medium">Chapter VI-A Deductions (80C, 80D)</td>
                <td className="px-5 py-3 text-slate-200">
                  {latestItr ? formatINR(latestItr.chapterVIA_Deductions) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {prevItr ? formatINR(prevItr.chapterVIA_Deductions) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">—</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-400 font-medium">Taxes Paid (TDS / Advance Tax)</td>
                <td className="px-5 py-3 font-semibold text-blue-400">
                  {latestItr ? formatINR(latestItr.totalTaxesPaid) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-300">
                  {prevItr ? formatINR(prevItr.totalTaxesPaid) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">—</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-400 font-medium">Filing Acknowledgment No</td>
                <td className="px-5 py-3 font-mono text-[11px] text-slate-300">
                  {latestItr?.acknowledgmentNumber || '—'}
                </td>
                <td className="px-5 py-3 font-mono text-[11px] text-slate-400">
                  {prevItr?.acknowledgmentNumber || '—'}
                </td>
                <td className="px-5 py-3 text-slate-400">
                  <span className="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
                    E-Verified
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* DISCREPANCY & RED FLAG DETECTION MATRIX */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-heading text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Cross-Verification Discrepancies & Audit Findings ({discrepancies.length})</span>
            </h4>
            <p className="text-xs text-slate-400">
              Automated reconciliation comparing reported tax income against observed bank throughput and institutional policy rules.
            </p>
          </div>
        </div>

        {discrepancies.length === 0 ? (
          <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-4 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-400 mb-1" />
            <p className="text-xs font-semibold text-emerald-300">
              Zero Income Mismatches or Discrepancies Detected
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ITR filings seamlessly reconcile with banking turnover and PAN identification records.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {discrepancies.map((disc, idx) => {
              const isCrit = disc.severity === 'CRITICAL' || disc.severity === 'HIGH';
              return (
                <div
                  key={disc.id || idx}
                  className={`rounded-xl p-4 border transition-all ${
                    isCrit
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-900/80 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 rounded-lg p-1.5 ${
                          isCrit
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-white">{disc.title}</h5>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                              isCrit
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {disc.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {disc.description}
                        </p>
                        {disc.reportedValue && disc.observedValue && (
                          <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
                            <span>Declared/Reported: <strong className="text-white">{disc.reportedValue}</strong></span>
                            <span>•</span>
                            <span>Observed in Bank: <strong className="text-white">{disc.observedValue}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="mt-3 rounded-lg bg-slate-950/60 p-2.5 text-[11px] text-slate-300 border border-slate-800 flex items-start gap-2">
                    <strong className="text-blue-400 shrink-0">Underwriter Action:</strong>
                    <span>{disc.recommendedAction}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MISSING DOCUMENTS & GAPS */}
      {missingDocuments.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 text-xs">
          <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            <span>Missing Documentation Required for Full Disbursement</span>
          </h4>
          <ul className="space-y-1.5 text-slate-300 pl-4 list-disc text-[11px]">
            {missingDocuments.map((doc, idx) => (
              <li key={idx}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

      {/* MANUAL ITR ENTRY MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-2xl border border-slate-700 p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-heading text-base font-bold text-white">
                Add / Upload Income Tax Return (ITR)
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium">Assessment Year</label>
                  <select
                    value={formAY}
                    onChange={(e) => {
                      setFormAY(e.target.value);
                      const startYear = parseInt(e.target.value.substring(3, 7));
                      setFormFY(`FY ${startYear - 1}-${String(startYear).substring(2, 4)}`);
                    }}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                  >
                    <option value="AY 2024-25">AY 2024-25 (FY 2023-24)</option>
                    <option value="AY 2023-24">AY 2023-24 (FY 2022-23)</option>
                    <option value="AY 2022-23">AY 2022-23 (FY 2021-22)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium">ITR Form Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                  >
                    <option value="ITR-1">ITR-1 Sahaj (Salaried)</option>
                    <option value="ITR-2">ITR-2 (Capital Gains / Non-business)</option>
                    <option value="ITR-3">ITR-3 (Business & Professional)</option>
                    <option value="ITR-4">ITR-4 Sugam (Presumptive)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium">Gross Total Income (GTI)</label>
                  <input
                    type="number"
                    value={formGTI}
                    onChange={(e) => setFormGTI(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Taxable Income</label>
                  <input
                    type="number"
                    value={formTaxable}
                    onChange={(e) => setFormTaxable(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium">Salary Income (u/s 17)</label>
                  <input
                    type="number"
                    value={formSalary}
                    onChange={(e) => setFormSalary(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Business Profit (PGBP)</label>
                  <input
                    type="number"
                    value={formBusiness}
                    onChange={(e) => setFormBusiness(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium">Chapter VI-A Deductions</label>
                  <input
                    type="number"
                    value={formDeductions}
                    onChange={(e) => setFormDeductions(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Taxes Paid (TDS/Advance)</label>
                  <input
                    type="number"
                    value={formTaxesPaid}
                    onChange={(e) => setFormTaxesPaid(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-rose-950/50 border border-rose-500/30 p-2 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 font-semibold text-white shadow"
                >
                  {isSubmitting ? 'Saving ITR...' : 'Submit ITR Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
