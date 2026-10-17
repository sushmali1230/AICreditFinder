import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileSearch,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Briefcase,
  User,
  CreditCard,
  Building,
} from 'lucide-react';
import { Customer } from '../../types';
import { formatINR, formatCompactINR } from '../../utils/formatters';

interface OverviewDashboardProps {
  customers: Customer[];
  onSelectCustomer: (customerId: string) => void;
  onOpenNewCustomer: () => void;
  isLoading: boolean;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  customers,
  onSelectCustomer,
  onOpenNewCustomer,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployment, setSelectedEmployment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.panNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEmp =
      selectedEmployment === 'ALL' || c.employmentType === selectedEmployment;

    const latestAssessment = c.creditAssessments?.[0];
    const status = latestAssessment?.status || 'PENDING_ANALYSIS';
    const matchesStatus =
      selectedStatus === 'ALL' || status === selectedStatus;

    return matchesSearch && matchesEmp && matchesStatus;
  });

  // Calculate high-level stats
  const totalRequested = customers.reduce((sum, c) => sum + c.requestedLoanAmount, 0);
  const approvedCount = customers.filter((c) => c.creditAssessments?.[0]?.status === 'APPROVED').length;
  const pendingCount = customers.filter((c) => c.creditAssessments?.[0]?.status === 'PENDING_APPROVAL').length;
  const highRiskCount = customers.filter((c) => c.riskCategory === 'HIGH_RISK' || c.riskCategory === 'CRITICAL').length;
  const avgCreditScore = customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + c.creditScore, 0) / customers.length) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Commercial Loan Underwriting Pipeline
          </h1>
          <p className="text-sm text-slate-400">
            Real-time credit analysis, automated statement audits, and multi-year ITR cross-verification
          </p>
        </div>

        <button
          onClick={onOpenNewCustomer}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <span>+ Add Loan Applicant</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pipeline */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Pipeline Value</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-white">
              {formatCompactINR(totalRequested)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Across {customers.length} commercial applicants
            </p>
          </div>
        </div>

        {/* Approved Sanctions */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sanctioned Loans</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-400">
              {approvedCount} Sanctioned
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Prudential committee approved
            </p>
          </div>
        </div>

        {/* Pending Committee Review */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Review</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
              <FileSearch className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-amber-400">
              {pendingCount} Applications
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Awaiting Approver sign-off
            </p>
          </div>
        </div>

        {/* High Risk / Discrepancy Alerts */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">High Risk / Flags</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-rose-400">
              {highRiskCount} Overleveraged
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Avg Portfolio Bureau Score: {avgCreditScore}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by borrower name, PAN, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
            <select
              value={selectedEmployment}
              onChange={(e) => setSelectedEmployment(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Employment</option>
              <option value="SALARIED">Salaried</option>
              <option value="SELF_EMPLOYED_BUSINESS">Business/SME</option>
              <option value="SELF_EMPLOYED_PROFESSIONAL">Professional</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Sanctioned</option>
              <option value="PENDING_APPROVAL">Pending Review</option>
              <option value="REASSESSMENT_REQUESTED">Reassessment</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications: Mobile Card View (Screens < md) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-2"></div>
            <p className="text-xs">Loading underwriting applications...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
            <FileSearch className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="font-medium text-slate-300 text-xs">No applications match your filter.</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const assessment = customer.creditAssessments?.[0];
            const grade = assessment?.riskGrade || 'BORDERLINE_C';
            const status = assessment?.status || 'PENDING_ANALYSIS';

            return (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer.id)}
                className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-md hover:border-slate-700 transition-all active:scale-[0.99] cursor-pointer"
              >
                {/* Header: Name, Avatar, Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-blue-400 font-bold border border-slate-700 text-sm">
                      {customer.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">
                        {customer.fullName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="font-mono">{customer.panNumber}</span>
                        <span>•</span>
                        <span>{customer.employmentType === 'SALARIED' ? customer.employerName || 'Salaried' : customer.businessName || 'Business'}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      customer.creditScore >= 750
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : customer.creditScore >= 680
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {customer.creditScore}
                  </span>
                </div>

                {/* Facility & Income Details */}
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-900/80 p-2.5 border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Requested Loan</span>
                    <span className="font-bold text-white">{formatINR(customer.requestedLoanAmount)}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{customer.requestedLoanTenureMonths}m • {customer.requestedLoanPurpose}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Verified Cash Flow</span>
                    {assessment ? (
                      <>
                        <span className="font-bold text-emerald-400">{formatINR(assessment.verifiedMonthlyIncome)}/mo</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">FOIR: <strong className="text-white">{assessment.foirRatio}%</strong></span>
                      </>
                    ) : (
                      <span className="text-slate-500 italic">Pending analysis</span>
                    )}
                  </div>
                </div>

                {/* Footer: Grade, Status, Action */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        grade === 'PRIME_A'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : grade === 'GOOD_B'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : grade === 'BORDERLINE_C'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {grade.split('_')[1]}
                    </span>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : status === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-300'
                          : status === 'PENDING_APPROVAL'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                    <span>Open</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Applications: Desktop Table View (Screens >= md) */}
      <div className="hidden md:block glass-panel overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Borrower Profile</th>
                <th className="px-5 py-3.5">PAN & Bureau</th>
                <th className="px-5 py-3.5">Facility Request</th>
                <th className="px-5 py-3.5">Verified Inflows & FOIR</th>
                <th className="px-5 py-3.5">Risk Grade</th>
                <th className="px-5 py-3.5">Decision Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-2"></div>
                    <p>Loading underwriting applications...</p>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FileSearch className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="font-medium text-slate-300">No loan applications match your filter criteria.</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting the search query or reset filters.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const assessment = customer.creditAssessments?.[0];
                  const grade = assessment?.riskGrade || 'BORDERLINE_C';
                  const status = assessment?.status || 'PENDING_ANALYSIS';

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-900/50 transition-colors group cursor-pointer"
                      onClick={() => onSelectCustomer(customer.id)}
                    >
                      {/* Name & Details */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-blue-400 font-semibold border border-slate-700">
                            {customer.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                              {customer.fullName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              {customer.employmentType === 'SALARIED' ? (
                                <>
                                  <Briefcase className="h-3 w-3 text-slate-500" />
                                  <span>{customer.employerName || 'Salaried'}</span>
                                </>
                              ) : (
                                <>
                                  <Building className="h-3 w-3 text-slate-500" />
                                  <span>{customer.businessName || 'Business Owner'}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{customer.city}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* PAN & Credit Score */}
                      <td className="px-5 py-4">
                        <div className="font-mono text-slate-200 font-medium">
                          {customer.panNumber}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              customer.creditScore >= 750
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : customer.creditScore >= 680
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            CIBIL {customer.creditScore}
                          </span>
                        </div>
                      </td>

                      {/* Requested Facility */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">
                          {formatINR(customer.requestedLoanAmount)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                          {customer.requestedLoanTenureMonths}m • {customer.requestedLoanPurpose}
                        </div>
                      </td>

                      {/* Verified Cash Flow & FOIR */}
                      <td className="px-5 py-4">
                        {assessment ? (
                          <div>
                            <div className="text-slate-200 font-medium">
                              {formatINR(assessment.verifiedMonthlyIncome)} / mo
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              FOIR:{' '}
                              <span
                                className={`font-semibold ${
                                  assessment.foirRatio <= 40
                                    ? 'text-emerald-400'
                                    : assessment.foirRatio <= 50
                                    ? 'text-blue-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {assessment.foirRatio}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Analysis Pending</span>
                        )}
                      </td>

                      {/* Risk Grade */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            grade === 'PRIME_A'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : grade === 'GOOD_B'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : grade === 'BORDERLINE_C'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {grade === 'PRIME_A' && 'Grade A (Prime)'}
                          {grade === 'GOOD_B' && 'Grade B (Good)'}
                          {grade === 'BORDERLINE_C' && 'Grade C (Borderline)'}
                          {grade === 'HIGH_RISK_D' && 'Grade D (High Risk)'}
                        </span>
                      </td>

                      {/* Decision Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : status === 'REJECTED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : status === 'PENDING_APPROVAL'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : status === 'REASSESSMENT_REQUESTED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCustomer(customer.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:text-white transition-all border border-slate-700 hover:border-blue-500"
                        >
                          <span>Underwrite</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
