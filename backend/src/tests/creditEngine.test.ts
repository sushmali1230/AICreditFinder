import { describe, it, expect } from 'vitest';
import { runCreditAssessment, DEFAULT_LENDING_POLICY } from '../services/creditEngine.js';
import { StatementAnalysisResult } from '../services/statementParser.js';
import { ParsedITR } from '../services/itrParser.js';

describe('Credit Engine & Underwriting Logic', () => {
  const mockStatement: StatementAnalysisResult = {
    bankName: 'HDFC Bank',
    accountNumberMasked: '•••• •••• 9012',
    accountType: 'SAVINGS',
    statementPeriodStart: new Date('2024-01-01'),
    statementPeriodEnd: new Date('2024-06-30'),
    totalCredits: 900000,
    totalDebits: 650000,
    netCashflow: 250000,
    averageMonthlyBalance: 85000,
    minMonthlyBalance: 25000,
    maxMonthlyBalance: 150000,
    monthlySalaryDetected: 150000,
    recurringEmiDetected: 30000,
    bounceCount: 0,
    unusualTransactionsCount: 0,
    salaryConsistencyScore: 98,
    detectedEmis: [
      { lenderOrNarration: 'HDFC LOAN ACH', amount: 30000, frequency: 'Monthly', detectedCount: 6 },
    ],
    monthlyBreakdowns: [
      { month: '2024-01', monthLabel: 'Jan 2024', totalCredits: 150000, totalDebits: 110000, netCashflow: 40000, closingBalance: 80000, transactionCount: 15 },
      { month: '2024-02', monthLabel: 'Feb 2024', totalCredits: 150000, totalDebits: 105000, netCashflow: 45000, closingBalance: 85000, transactionCount: 14 },
      { month: '2024-03', monthLabel: 'Mar 2024', totalCredits: 150000, totalDebits: 115000, netCashflow: 35000, closingBalance: 82000, transactionCount: 18 },
      { month: '2024-04', monthLabel: 'Apr 2024', totalCredits: 150000, totalDebits: 100000, netCashflow: 50000, closingBalance: 90000, transactionCount: 16 },
      { month: '2024-05', monthLabel: 'May 2024', totalCredits: 150000, totalDebits: 110000, netCashflow: 40000, closingBalance: 88000, transactionCount: 15 },
      { month: '2024-06', monthLabel: 'Jun 2024', totalCredits: 150000, totalDebits: 110000, netCashflow: 40000, closingBalance: 92000, transactionCount: 15 },
    ],
    transactions: [],
  };

  const mockItrs: ParsedITR[] = [
    {
      assessmentYear: 'AY 2023-24',
      financialYear: 'FY 2022-23',
      formType: 'ITR-1',
      filingDate: new Date('2023-07-20'),
      filingStatus: 'VERIFIED_FILED',
      acknowledgmentNumber: '109823471092834',
      grossTotalIncome: 1650000,
      taxableIncome: 1450000,
      salaryIncome: 1650000,
      businessProfessionIncome: 0,
      otherIncome: 0,
      chapterVIA_Deductions: 150000,
      totalTaxesPaid: 210000,
      refundOrPayable: 0,
      panNumber: 'ABCDE1234F',
      isVerified: true,
    },
    {
      assessmentYear: 'AY 2024-25',
      financialYear: 'FY 2023-24',
      formType: 'ITR-1',
      filingDate: new Date('2024-07-15'),
      filingStatus: 'VERIFIED_FILED',
      acknowledgmentNumber: '298374981273948',
      grossTotalIncome: 1850000,
      taxableIncome: 1620000,
      salaryIncome: 1850000,
      businessProfessionIncome: 0,
      otherIncome: 0,
      chapterVIA_Deductions: 150000,
      totalTaxesPaid: 260000,
      refundOrPayable: 0,
      panNumber: 'ABCDE1234F',
      isVerified: true,
    },
  ];

  it('evaluates a prime salaried customer accurately', () => {
    const customer = {
      fullName: 'Rajesh Sharma',
      panNumber: 'ABCDE1234F',
      employmentType: 'SALARIED',
      creditScore: 785,
      requestedLoanAmount: 2000000,
      requestedLoanTenureMonths: 60,
      requestedLoanPurpose: 'Home Renovation',
    };

    const result = runCreditAssessment(customer, mockStatement, mockItrs, DEFAULT_LENDING_POLICY);

    expect(result.verifiedMonthlyIncome).toBe(150000);
    expect(result.existingDebtObligations).toBe(30000);
    expect(result.foirRatio).toBe(20.0);
    expect(result.riskGrade).toBe('PRIME_A');
    expect(result.recommendedDecision).toBe('RECOMMEND_APPROVAL');
    expect(result.affordableAdditionalEmi).toBe(45000); // 50% of 150k = 75k - 30k = 45k
    expect(result.conservativeScenario).toBeDefined();
    expect(result.standardScenario).toBeDefined();
    expect(result.aggressiveScenario).toBeDefined();
  });

  it('detects overleveraged high-risk applicant and limits loan capacity', () => {
    const overleveragedStatement: StatementAnalysisResult = {
      ...mockStatement,
      monthlySalaryDetected: 60000,
      recurringEmiDetected: 42000, // 70% FOIR!
      bounceCount: 2,
    };

    const customer = {
      fullName: 'High Risk Applicant',
      panNumber: 'ABCDE1234F',
      employmentType: 'SALARIED',
      creditScore: 610,
      requestedLoanAmount: 1500000,
      requestedLoanTenureMonths: 48,
      requestedLoanPurpose: 'Personal Loan',
    };

    const result = runCreditAssessment(customer, overleveragedStatement, mockItrs, DEFAULT_LENDING_POLICY);

    expect(result.foirRatio).toBeGreaterThan(60);
    expect(result.affordableAdditionalEmi).toBe(0);
    expect(result.riskGrade).toBe('HIGH_RISK_D');
    expect(result.riskFactors.length).toBeGreaterThan(0);
  });
});
