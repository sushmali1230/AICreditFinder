import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Download,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Info,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Calendar,
  IndianRupee,
  FileText,
} from 'lucide-react';
import { Customer, CreditAssessment, ScenarioResult } from '../../types';
import { formatINR, formatPercent, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface CreditAssessmentTabProps {
  customer: Customer;
  assessment: CreditAssessment | null;
  onRefreshAssessment: () => void;
  onOpenDecisionModal: (action: 'APPROVE' | 'REJECT' | 'REQUEST_REASSESSMENT') => void;
}

export const CreditAssessmentTab: React.FC<CreditAssessmentTabProps> = ({
  customer,
  assessment,
  onRefreshAssessment,
  onOpenDecisionModal,
}) => {
  const { activeRole } = useAuth();

  // Sandbox inputs
  const [sandboxRate, setSandboxRate] = useState<number>(assessment?.interestRateAnnual || 10.5);
  const [sandboxTenure, setSandboxTenure] = useState<number>(assessment?.requestedTenureMonths || customer.requestedLoanTenureMonths);
  const [sandboxAmount, setSandboxAmount] = useState<number>(assessment?.requestedAmount || customer.requestedLoanAmount);
  const [analystNotes, setAnalystNotes] = useState<string>(assessment?.analystNotes || '');
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Parse JSON fields if strings
  const positiveIndicators: string[] = assessment
    ? typeof assessment.positiveIndicators === 'string'
      ? JSON.parse(assessment.positiveIndicators)
      : assessment.positiveIndicators
    : [];

  const riskFactors: string[] = assessment
    ? typeof assessment.riskFactors === 'string'
      ? JSON.parse(assessment.riskFactors)
      : assessment.riskFactors
    : [];

  const calculationAssumptions: string[] = assessment
    ? typeof assessment.calculationAssumptions === 'string'
      ? JSON.parse(assessment.calculationAssumptions)
      : assessment.calculationAssumptions
    : [];

  const conservativeScenario: ScenarioResult | null = assessment
    ? typeof assessment.conservativeScenario === 'string'
      ? JSON.parse(assessment.conservativeScenario)
      : assessment.conservativeScenario
    : null;

  const standardScenario: ScenarioResult | null = assessment
    ? typeof assessment.standardScenario === 'string'
      ? JSON.parse(assessment.standardScenario)
      : assessment.standardScenario
    : null;

  const aggressiveScenario: ScenarioResult | null = assessment
    ? typeof assessment.aggressiveScenario === 'string'
      ? JSON.parse(assessment.aggressiveScenario)
      : assessment.aggressiveScenario
    : null;

  const handleRunReassessment = async () => {
    try {
      setIsRecalculating(true);
      await api.assessments.run(customer.id, {
        customInterestRate: Number(sandboxRate),
        customTenureMonths: Number(sandboxTenure),
        customRequestedAmount: Number(sandboxAmount),
        analystNotes,
      });
      onRefreshAssessment();
    } catch (err: any) {
      alert(`Re-assessment failed: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDownloadCAM = () => {
    if (!assessment) return;
    const downloadUrl = api.assessments.getPDFDownloadUrl(assessment.id);
    window.open(downloadUrl, '_blank');
  };

  if (!assessment) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800">
        <Sliders className="mx-auto h-12 w-12 text-blue-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-white">No Assessment Generated Yet</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Execute the explainable underwriting engine to calculate verified income, FOIR, DTI, and multi-scenario loan eligibility.
        </p>
        <button
          onClick={handleRunReassessment}
          disabled={isRecalculating}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all"
        >
          <span>Run Credit Assessment</span>
        </button>
      </div>
    );
  }

  const grade = assessment.riskGrade;
  const isApproved = assessment.status === 'APPROVED';
  const isRejected = assessment.status === 'REJECTED';

  return (
    <div className="space-y-6">
      {/* Top Banner: Risk Grade & Sanction Status Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border ${
                grade === 'PRIME_A'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 glow-emerald'
                  : grade === 'GOOD_B'
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 glow-blue'
                  : grade === 'BORDERLINE_C'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 glow-amber'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400 glow-rose'
              }`}
            >
              <span className="font-heading text-lg sm:text-xl font-extrabold">
                {grade.split('_')[1]}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg sm:text-xl font-bold text-white">
                  Risk Grade: {grade.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  v{assessment.version}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">
                Deterministic calculation engine • Evaluated {formatDate(assessment.createdAt)}
              </p>
            </div>
          </div>

          {/* Decisioning & Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCAM}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition-all shadow-sm col-span-2 sm:col-span-1"
              title="Download official Credit Appraisal Memorandum"
            >
              <Download className="h-4 w-4 text-blue-400" />
              <span>Download CAM (PDF)</span>
            </button>

            {/* Approver Role Actions */}
            {(activeRole === 'APPROVER' || activeRole === 'ADMIN') && (
              <>
                <button
                  onClick={() => onOpenDecisionModal('APPROVE')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sanction</span>
                </button>

                <button
                  onClick={() => onOpenDecisionModal('REJECT')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 px-3 py-2 text-xs font-bold transition-all"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Reject</span>
                </button>
              </>
            )}

            <button
              onClick={() => onOpenDecisionModal('REQUEST_REASSESSMENT')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-2 text-xs font-bold transition-all col-span-2 sm:col-span-1"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reassess</span>
            </button>
          </div>
        </div>

        {/* Sanction Status Banner if approved or rejected */}
        {isApproved && (
          <div className="mt-4 rounded-xl bg-emerald-950/60 border border-emerald-600/30 p-3 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Facility Sanctioned:</strong> Approved for {formatINR(assessment.approvedAmount || assessment.calculatedMaxLoanPrincipal)} at {assessment.approvedInterestRate || assessment.interestRateAnnual}% p.a. by {assessment.decisionBy || 'CUO'}.
              </span>
            </div>
            {assessment.decisionDate && <span>{formatDate(assessment.decisionDate)}</span>}
          </div>
        )}

        {isRejected && (
          <div className="mt-4 rounded-xl bg-rose-950/60 border border-rose-600/30 p-3 text-xs text-rose-300 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
            <span>
              <strong>Sanction Rejected:</strong> {assessment.approverNotes || 'Applicant exceeds maximum institutional debt servicing risk thresholds.'}
            </span>
          </div>
        )}
      </div>

      {/* Financial Capacity Ratio Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {/* Verified Income */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Verified Income</span>
          <div className="mt-1.5 text-lg font-bold text-white">
            {formatINR(assessment.verifiedMonthlyIncome)}
          </div>
          <span className="text-[10px] text-slate-400">per month (net)</span>
        </div>

        {/* Existing Obligations */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Existing EMIs</span>
          <div className="mt-1.5 text-lg font-bold text-slate-200">
            {formatINR(assessment.existingDebtObligations)}
          </div>
          <span className="text-[10px] text-slate-400">recurring monthly debt</span>
        </div>

        {/* Current FOIR */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Current FOIR</span>
          <div
            className={`mt-1.5 text-lg font-bold ${
              assessment.foirRatio <= 40
                ? 'text-emerald-400'
                : assessment.foirRatio <= 50
                ? 'text-blue-400'
                : 'text-rose-400'
            }`}
          >
            {assessment.foirRatio}%
          </div>
          <span className="text-[10px] text-slate-400">Max policy: 50%</span>
        </div>

        {/* Current DTI */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Annual DTI</span>
          <div className="mt-1.5 text-lg font-bold text-slate-200">
            {assessment.dtiRatio}%
          </div>
          <span className="text-[10px] text-slate-400">Debt-to-income ratio</span>
        </div>

        {/* Disposable Income */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Disposable Cash</span>
          <div className="mt-1.5 text-lg font-bold text-emerald-400">
            {formatINR(assessment.netDisposableIncome)}
          </div>
          <span className="text-[10px] text-slate-400">post living expenses</span>
        </div>

        {/* Affordable Additional EMI */}
        <div className="glass-panel rounded-2xl p-4 border border-blue-500/30 bg-blue-950/20 glow-blue">
          <span className="text-[11px] font-semibold text-blue-300">Affordable EMI</span>
          <div className="mt-1.5 text-lg font-bold text-blue-400">
            {formatINR(assessment.affordableAdditionalEmi)}
          </div>
          <span className="text-[10px] text-blue-300/80">room for new loan</span>
        </div>
      </div>

      {/* THREE LOAN UNDERWRITING SCENARIOS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <span>Multi-Scenario Affordability Analysis</span>
              <span className="text-[11px] font-normal text-slate-400 rounded-md bg-slate-800 px-2 py-0.5 border border-slate-700">
                Institutional Estimates
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Clear scenarios computed with exact decimal amortization mathematics. Labeled as estimates subject to committee sign-off.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Conservative Scenario */}
          {conservativeScenario && (
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 border border-slate-700">
                    Conservative
                  </span>
                  <span className="text-xs text-slate-400">FOIR: 40%</span>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-slate-400">Max Eligible Principal</span>
                  <div className="text-2xl font-bold tracking-tight text-white mt-0.5">
                    {formatINR(conservativeScenario.principal)}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs divide-y divide-slate-800/60">
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Monthly EMI:</span>
                    <span className="font-semibold text-white">{formatINR(conservativeScenario.monthlyEmi)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Interest Rate:</span>
                    <span>{conservativeScenario.annualInterestRate}% p.a. (+50 bps buffer)</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Tenure:</span>
                    <span>{conservativeScenario.tenureMonths} Months</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Total Interest:</span>
                    <span>{formatINR(conservativeScenario.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Total Repayment:</span>
                    <span>{formatINR(conservativeScenario.totalRepayment)}</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                {conservativeScenario.description}
              </p>
            </div>
          )}

          {/* 2. Standard Scenario (Recommended) */}
          {standardScenario && (
            <div className="glass-panel-elevated rounded-2xl p-5 border border-blue-500/40 flex flex-col justify-between glow-blue relative">
              <div className="absolute -top-3 right-4 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow">
                Recommended
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-blue-500/20 px-2.5 py-1 text-xs font-bold text-blue-300 border border-blue-500/30">
                    Standard Policy
                  </span>
                  <span className="text-xs text-blue-300 font-semibold">FOIR: 50%</span>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-slate-400">Max Eligible Principal</span>
                  <div className="text-2xl font-bold tracking-tight text-white mt-0.5">
                    {formatINR(standardScenario.principal)}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs divide-y divide-slate-800/60">
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Monthly EMI:</span>
                    <span className="font-semibold text-blue-400">{formatINR(standardScenario.monthlyEmi)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Interest Rate:</span>
                    <span>{standardScenario.annualInterestRate}% p.a. (Benchmark)</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Tenure:</span>
                    <span>{standardScenario.tenureMonths} Months</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Total Interest:</span>
                    <span>{formatINR(standardScenario.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Total Repayment:</span>
                    <span>{formatINR(standardScenario.totalRepayment)}</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-blue-200/90 italic bg-blue-950/40 p-2 rounded-lg border border-blue-500/20">
                {standardScenario.description}
              </p>
            </div>
          )}

          {/* 3. Higher Affordability Scenario */}
          {aggressiveScenario && (
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-purple-500/20 px-2.5 py-1 text-xs font-bold text-purple-300 border border-purple-500/30">
                    Higher Affordability
                  </span>
                  <span className="text-xs text-purple-300">FOIR: 60%</span>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-slate-400">Max Eligible Principal</span>
                  <div className="text-2xl font-bold tracking-tight text-white mt-0.5">
                    {formatINR(aggressiveScenario.principal)}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs divide-y divide-slate-800/60">
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Monthly EMI:</span>
                    <span className="font-semibold text-white">{formatINR(aggressiveScenario.monthlyEmi)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Interest Rate:</span>
                    <span>{aggressiveScenario.annualInterestRate}% p.a. (Extended)</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Tenure:</span>
                    <span>{aggressiveScenario.tenureMonths} Months (+12m)</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Total Interest:</span>
                    <span>{formatINR(aggressiveScenario.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-slate-300">
                    <span className="text-slate-400">Total Repayment:</span>
                    <span>{formatINR(aggressiveScenario.totalRepayment)}</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                {aggressiveScenario.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* POSITIVE DRIVERS & RISK FACTORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Positive Indicators */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Positive Financial Indicators ({positiveIndicators.length})</span>
          </h4>
          <ul className="space-y-2 text-xs">
            {positiveIndicators.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-300">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risk Factors */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span>Risk Factors & Discrepancies ({riskFactors.length})</span>
          </h4>
          {riskFactors.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No adverse risk flags or banking dishonor events detected.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {riskFactors.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-300">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* PLAIN-LANGUAGE AI EXPLANATION BOX */}
      {assessment.aiExplanation && (
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 bg-indigo-950/20">
          <div className="flex items-center gap-2 mb-2 text-indigo-400">
            <Sparkles className="h-4 w-4" />
            <h4 className="text-sm font-bold text-white">Underwriting Narrative & Committee Brief</h4>
          </div>
          <div className="prose prose-invert prose-xs text-slate-300 max-w-none whitespace-pre-line text-xs leading-relaxed">
            {assessment.aiExplanation}
          </div>
        </div>
      )}

      {/* CALCULATION ASSUMPTIONS TRANSPARENCY */}
      {calculationAssumptions.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-semibold text-slate-300 mb-2">
            <Info className="h-3.5 w-3.5 text-blue-400" />
            <span>Deterministic Math & Lending Policy Assumptions</span>
          </div>
          <ul className="space-y-1 pl-5 list-disc text-[11px]">
            {calculationAssumptions.map((assump, idx) => (
              <li key={idx}>{assump}</li>
            ))}
          </ul>
        </div>
      )}

      {/* REASSESSMENT SANDBOX */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Sliders className="h-4 w-4 text-blue-400" />
          <span>Interactive Underwriting Sandbox & Re-assessment</span>
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Adjust loan facility variables to model counter-offers, tenure extensions, or rate concessions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Requested Amount */}
          <div>
            <label className="text-xs text-slate-300 font-medium">Loan Amount (₹)</label>
            <input
              type="number"
              value={sandboxAmount}
              onChange={(e) => setSandboxAmount(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Interest Rate */}
          <div>
            <label className="text-xs text-slate-300 font-medium">Annual Interest Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={sandboxRate}
              onChange={(e) => setSandboxRate(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Tenure */}
          <div>
            <label className="text-xs text-slate-300 font-medium">Tenure (Months)</label>
            <input
              type="number"
              value={sandboxTenure}
              onChange={(e) => setSandboxTenure(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3">
          <label className="text-xs text-slate-300 font-medium">Credit Analyst Underwriting Notes</label>
          <textarea
            rows={2}
            value={analystNotes}
            onChange={(e) => setAnalystNotes(e.target.value)}
            placeholder="Add notes on borrower justification, collateral, or co-borrower stipulations..."
            className="mt-1.5 w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleRunReassessment}
            disabled={isRecalculating}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow transition-all disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>{isRecalculating ? 'Calculating...' : 'Recalculate & Re-assess'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
