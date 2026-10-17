export type UserRole = 'ANALYST' | 'APPROVER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId: string;
  department: string;
}

export type EmploymentType = 'SALARIED' | 'SELF_EMPLOYED_BUSINESS' | 'SELF_EMPLOYED_PROFESSIONAL';
export type RiskCategory = 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRITICAL' | 'PENDING_ANALYSIS';
export type AssessmentStatus = 'DRAFT' | 'ANALYSIS_COMPLETE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REASSESSMENT_REQUESTED';
export type RiskGrade = 'PRIME_A' | 'GOOD_B' | 'BORDERLINE_C' | 'HIGH_RISK_D';

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  panNumber: string;
  aadhaarMasked: string;
  dateOfBirth: string;
  employmentType: EmploymentType;
  employerName?: string | null;
  businessName?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  creditScore: number;
  requestedLoanAmount: number;
  requestedLoanTenureMonths: number;
  requestedLoanPurpose: string;
  riskCategory: RiskCategory;
  status: string;
  createdAt: string;
  updatedAt: string;
  bankStatements?: BankStatement[];
  itrRecords?: ItrRecord[];
  creditAssessments?: CreditAssessment[];
}

export interface BankTransaction {
  id: string;
  bankStatementId: string;
  date: string;
  description: string;
  referenceNo?: string | null;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  category: 'SALARY' | 'BUSINESS_CREDIT' | 'EMI_OUTFLOW' | 'INVESTMENT' | 'UTILITIES_RENT' | 'CASH_WITHDRAWAL' | 'CASH_DEPOSIT' | 'BOUNCE_PENALTY' | 'OTHER';
  balanceAfter?: number | null;
  isUnusual: boolean;
  isBounced: boolean;
  bounceReason?: string | null;
  notes?: string | null;
}

export interface MonthlyBreakdown {
  month: string;
  monthLabel: string;
  totalCredits: number;
  totalDebits: number;
  netCashflow: number;
  closingBalance: number;
  transactionCount: number;
}

export interface DetectedEMI {
  lenderOrNarration: string;
  amount: number;
  frequency: string;
  detectedCount: number;
}

export interface BankStatement {
  id: string;
  customerId: string;
  bankName: string;
  accountNumberMasked: string;
  accountType: 'SAVINGS' | 'CURRENT';
  statementPeriodStart: string;
  statementPeriodEnd: string;
  totalCredits: number;
  totalDebits: number;
  netCashflow: number;
  averageMonthlyBalance: number;
  minMonthlyBalance: number;
  maxMonthlyBalance: number;
  monthlySalaryDetected: number;
  recurringEmiDetected: number;
  bounceCount: number;
  unusualTransactionsCount: number;
  salaryConsistencyScore: number;
  rawFileUrl?: string | null;
  fileFormat: string;
  uploadedAt: string;
  transactions?: BankTransaction[];
}

export interface ItrRecord {
  id: string;
  customerId: string;
  assessmentYear: string;
  financialYear: string;
  formType: string;
  filingDate?: string | null;
  filingStatus: string;
  acknowledgmentNumber: string;
  grossTotalIncome: number;
  taxableIncome: number;
  salaryIncome: number;
  businessProfessionIncome: number;
  otherIncome: number;
  chapterVIA_Deductions: number;
  totalTaxesPaid: number;
  refundOrPayable: number;
  panNumber?: string | null;
  isVerified: boolean;
  uploadedAt: string;
}

export interface ScenarioResult {
  scenarioName: 'Conservative' | 'Standard' | 'Higher Affordability';
  foirPct: number;
  affordableEmi: number;
  description: string;
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  monthlyEmi: number;
  totalInterest: number;
  totalRepayment: number;
}

export interface DiscrepancyItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'INCOME_MISMATCH' | 'ITR_TREND' | 'BANKING_CONDUCT' | 'DOCUMENTATION_GAP' | 'IDENTITY_COMPLIANCE';
  title: string;
  description: string;
  reportedValue?: string | number;
  observedValue?: string | number;
  variancePercentage?: number;
  recommendedAction: string;
}

export interface IncomeTrendAnalysis {
  previousYearFY: string;
  previousYearIncome: number;
  latestYearFY: string;
  latestYearIncome: number;
  absoluteChange: number;
  growthPercentage: number;
  trendClassification: 'STRONG_GROWTH' | 'MODERATE_GROWTH' | 'STABLE' | 'DECLINING' | 'SHARP_CONTRACTION';
  narrative: string;
}

export interface CrossVerificationReport {
  hasTwoYearsITR: boolean;
  incomeTrend?: IncomeTrendAnalysis;
  annualBankCreditSum: number;
  latestItrGTI: number;
  varianceGtiVsBankCreditPct: number;
  discrepancies: DiscrepancyItem[];
  missingDocuments: string[];
  positiveHighlights: string[];
  riskGradePenaltyPoints: number;
}

export interface CreditAssessment {
  id: string;
  customerId: string;
  version: number;
  status: AssessmentStatus;
  verifiedMonthlyIncome: number;
  existingDebtObligations: number;
  netDisposableIncome: number;
  dtiRatio: number;
  foirRatio: number;
  affordableAdditionalEmi: number;
  requestedAmount: number;
  requestedTenureMonths: number;
  interestRateAnnual: number;
  calculatedMaxLoanPrincipal: number;
  calculatedEmi: number;
  totalInterestPayable: number;
  totalRepaymentAmount: number;
  riskGrade: RiskGrade;
  positiveIndicators: string[] | string;
  riskFactors: string[] | string;
  incomeDiscrepancies: DiscrepancyItem[] | string;
  missingDocuments: string[] | string;
  calculationAssumptions: string[] | string;
  recommendationReasoning: string;
  conservativeScenario: ScenarioResult | string;
  standardScenario: ScenarioResult | string;
  aggressiveScenario: ScenarioResult | string;
  aiExplanation?: string | null;
  analystNotes?: string | null;
  approverNotes?: string | null;
  decisionBy?: string | null;
  decisionDate?: string | null;
  approvedAmount?: number | null;
  approvedTenureMonths?: number | null;
  approvedInterestRate?: number | null;
  createdAt: string;
  updatedAt: string;
  crossVerification?: CrossVerificationReport;
}

export interface LendingPolicyConfig {
  id: string;
  policyName: string;
  description: string;
  maxFoirSalaried: number;
  maxFoirSelfEmployed: number;
  minCreditScore: number;
  minAverageMonthlyBalance: number;
  baseInterestRate: number;
  haircutUnverifiedIncome: number;
  maxAllowedBouncesLast6Months: number;
  isDefault: boolean;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}
