import React, { useState } from 'react';
import {
  User,
  CreditCard,
  Building,
  Briefcase,
  Sliders,
  FileSpreadsheet,
  FileCheck2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { Customer, CreditAssessment, BankStatement, ItrRecord } from '../../types';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { CreditAssessmentTab } from './CreditAssessmentTab';
import { BankStatementTab } from './BankStatementTab';
import { ITRVerificationTab } from './ITRVerificationTab';

interface CustomerWorkspaceProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onRefreshCustomer: () => void;
  onOpenDecisionModal: (action: 'APPROVE' | 'REJECT' | 'REQUEST_REASSESSMENT') => void;
}

export const CustomerWorkspace: React.FC<CustomerWorkspaceProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onRefreshCustomer,
  onOpenDecisionModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'assessment' | 'statements' | 'itr'>('assessment');

  const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  if (!customer) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border border-slate-800">
        <p className="text-slate-400">No customer application selected.</p>
      </div>
    );
  }

  const latestAssessment: CreditAssessment | null = customer.creditAssessments?.[0] || null;
  const statements: BankStatement[] = customer.bankStatements || [];
  const itrs: ItrRecord[] = customer.itrRecords || [];

  // Parse discrepancies and missing documents
  const discrepancies = latestAssessment
    ? typeof latestAssessment.incomeDiscrepancies === 'string'
      ? JSON.parse(latestAssessment.incomeDiscrepancies)
      : latestAssessment.incomeDiscrepancies || []
    : [];

  const missingDocuments = latestAssessment
    ? typeof latestAssessment.missingDocuments === 'string'
      ? JSON.parse(latestAssessment.missingDocuments)
      : latestAssessment.missingDocuments || []
    : [];

  return (
    <div className="space-y-6">
      {/* Top Borrower Profile Header */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-lg sm:text-xl shadow-lg shadow-indigo-600/30">
              {customer.fullName.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Borrower Selector Dropdown */}
                <div className="relative inline-block max-w-full">
                  <select
                    value={customer.id}
                    onChange={(e) => onSelectCustomer(e.target.value)}
                    className="appearance-none font-heading text-base sm:text-xl font-bold text-white bg-slate-900 border border-slate-700 rounded-xl pr-7 sm:pr-8 pl-2.5 sm:pl-3 py-1 cursor-pointer focus:border-blue-500 focus:outline-none max-w-[190px] sm:max-w-none truncate"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.fullName} ({c.employmentType === 'SALARIED' ? 'Salaried' : 'Business'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Employment Badge */}
                <span className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                  {customer.employmentType === 'SALARIED' ? (
                    <>
                      <Briefcase className="h-3 w-3" />
                      <span>{customer.employerName || 'Salaried'}</span>
                    </>
                  ) : (
                    <>
                      <Building className="h-3 w-3" />
                      <span>{customer.businessName || 'Business Owner'}</span>
                    </>
                  )}
                </span>

                {/* Bureau Score */}
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                    customer.creditScore >= 750
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : customer.creditScore >= 680
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  CIBIL {customer.creditScore}
                </span>
              </div>

              {/* Contact & KYC Details */}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="font-mono text-slate-200">PAN: {customer.panNumber}</span>
                <span>•</span>
                <span>Aadhaar: {customer.aadhaarMasked}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  {customer.city}, {customer.state}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-500" />
                  {customer.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Requested Facility Badge */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-left sm:text-right">
            <span className="text-[11px] text-slate-400">Requested Credit Facility</span>
            <div className="text-xl font-bold text-white">
              {formatINR(customer.requestedLoanAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {customer.requestedLoanTenureMonths} Months • {customer.requestedLoanPurpose}
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation (Horizontal scrollable on mobile) */}
        <div className="mt-5 border-t border-slate-800 pt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveSubTab('assessment')}
            className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'assessment'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>
              <span className="sm:hidden">Assessment & Scenarios</span>
              <span className="hidden sm:inline">Credit Assessment & Scenarios</span>
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('statements')}
            className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'statements'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>
              <span className="sm:hidden">Statements ({statements.length})</span>
              <span className="hidden sm:inline">Bank Statement Audit ({statements.length})</span>
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('itr')}
            className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'itr'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>
              <span className="sm:hidden">ITR Audit ({itrs.length})</span>
              <span className="hidden sm:inline">Multi-Year ITR Cross-Verification ({itrs.length})</span>
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Contents */}
      {activeSubTab === 'assessment' && (
        <CreditAssessmentTab
          customer={customer}
          assessment={latestAssessment}
          onRefreshAssessment={onRefreshCustomer}
          onOpenDecisionModal={onOpenDecisionModal}
        />
      )}

      {activeSubTab === 'statements' && (
        <BankStatementTab
          customerId={customer.id}
          statements={statements}
          onRefreshCustomer={onRefreshCustomer}
        />
      )}

      {activeSubTab === 'itr' && (
        <ITRVerificationTab
          customer={customer}
          itrs={itrs}
          discrepancies={discrepancies}
          missingDocuments={missingDocuments}
          onRefreshCustomer={onRefreshCustomer}
        />
      )}
    </div>
  );
};
