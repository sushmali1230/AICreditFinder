import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { Customer, CreditAssessment } from '../../types';
import { formatINR } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface DecisionModalProps {
  isOpen: boolean;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REASSESSMENT';
  customer: Customer;
  assessment: CreditAssessment | null;
  onClose: () => void;
  onDecisionComplete: () => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  action,
  customer,
  assessment,
  onClose,
  onDecisionComplete,
}) => {
  const { currentUser, activeRole } = useAuth();

  const defaultSanctionAmount = assessment?.calculatedMaxLoanPrincipal || customer.requestedLoanAmount;
  const [approvedAmount, setApprovedAmount] = useState<number>(defaultSanctionAmount);
  const [approvedTenure, setApprovedTenure] = useState<number>(assessment?.requestedTenureMonths || customer.requestedLoanTenureMonths);
  const [approvedRate, setApprovedRate] = useState<number>(assessment?.interestRateAnnual || 10.5);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !assessment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await api.assessments.recordDecision(assessment.id, {
        action,
        approvedAmount: action === 'APPROVE' ? Number(approvedAmount) : undefined,
        approvedTenureMonths: action === 'APPROVE' ? Number(approvedTenure) : undefined,
        approvedInterestRate: action === 'APPROVE' ? Number(approvedRate) : undefined,
        approverNotes: notes,
      });

      onDecisionComplete();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApprove = action === 'APPROVE';
  const isReject = action === 'REJECT';
  const isReassess = action === 'REQUEST_REASSESSMENT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="glass-panel rounded-2xl border border-slate-700 p-4 sm:p-6 w-full max-w-lg shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isApprove
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isReject
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isApprove && <CheckCircle2 className="h-5 w-5" />}
              {isReject && <XCircle className="h-5 w-5" />}
              {isReassess && <RotateCcw className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-white">
                {isApprove && 'Formal Credit Sanction Authorization'}
                {isReject && 'Formal Credit Rejection Determination'}
                {isReassess && 'Request Application Reassessment'}
              </h3>
              <p className="text-xs text-slate-400">
                Borrower: <strong className="text-white">{customer.fullName}</strong> ({customer.panNumber})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Regulatory Disclaimer Banner */}
        <div className="mt-3 rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Human Underwriting Compliance:</strong> As per RBI guidelines and institutional credit governance, loan approval determinations cannot be automated solely on AI. Your identity (<strong>{currentUser?.name}</strong>, {activeRole}) will be logged in the immutable audit trail.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Approval Parameters */}
          {isApprove && (
            <div className="space-y-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-3.5">
              <h4 className="font-bold text-emerald-300">Sanction Terms & Parameters</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-slate-300 font-medium">Sanction Amount (₹)</label>
                  <input
                    type="number"
                    step={10000}
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(Number(e.target.value))}
                    required
                    className="mt-1 w-full font-bold text-emerald-400 rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Tenure (Months)</label>
                  <input
                    type="number"
                    value={approvedTenure}
                    onChange={(e) => setApprovedTenure(Number(e.target.value))}
                    required
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={approvedRate}
                    onChange={(e) => setApprovedRate(Number(e.target.value))}
                    required
                    className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Underwriter Notes / Stipulations */}
          <div>
            <label className="text-slate-300 font-medium">
              {isApprove && 'Approver Conditions & Disbursement Stipulations *'}
              {isReject && 'Official Grounds for Rejection *'}
              {isReassess && 'Underwriting Instructions for Reassessment *'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isApprove
                  ? 'e.g. Sanction approved subject to submission of original title deed and NACH auto-debit registration.'
                  : isReject
                  ? 'e.g. Existing debt servicing burden consumes > 65% of net income; multiple inward clearing returns in last 6 months.'
                  : 'e.g. Please collect latest GSTR-3B filings to verify Q2 business turnover.'
              }
              required
              className="mt-1.5 w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-rose-950/50 border border-rose-500/30 p-2.5 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-xl px-5 py-2 font-bold text-white shadow-lg transition-all ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : isReject
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              }`}
            >
              {isSubmitting
                ? 'Recording...'
                : isApprove
                ? 'Sign & Authorize Sanction'
                : isReject
                ? 'Sign & Issue Rejection'
                : 'Send for Reassessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
