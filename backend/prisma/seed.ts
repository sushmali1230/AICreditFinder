import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { runCreditAssessment } from '../src/services/creditEngine.js';
import { analyzeBankTransactions, ParsedTransaction } from '../src/services/statementParser.js';
import { ParsedITR } from '../src/services/itrParser.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Bank Credit Analysis & Loan Recommendation System...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.creditAssessment.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.bankStatement.deleteMany();
  await prisma.itrRecord.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.lendingPolicyConfig.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Bank Employees
  const passwordHash = await bcrypt.hash('password123', 10);

  const analyst = await prisma.user.create({
    data: {
      email: 'analyst@apexbank.com',
      passwordHash,
      name: 'Vikram Mehta',
      role: 'ANALYST',
      employeeId: 'EMP-ANL-1042',
      department: 'Retail Credit Risk & Underwriting',
    },
  });

  const approver = await prisma.user.create({
    data: {
      email: 'approver@apexbank.com',
      passwordHash,
      name: 'Ananya Deshmukh',
      role: 'APPROVER',
      employeeId: 'EMP-APP-8901',
      department: 'Commercial Credit Committee',
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@apexbank.com',
      passwordHash,
      name: 'Suresh Nambiar',
      role: 'ADMIN',
      employeeId: 'EMP-ADM-0021',
      department: 'Risk Operations & Compliance',
    },
  });

  console.log('Bank employees seeded:');
  console.log('  - analyst@apexbank.com (Credit Risk Analyst)');
  console.log('  - approver@apexbank.com (Chief Underwriting Officer / Approver)');
  console.log('  - admin@apexbank.com (Risk Operations Admin)');

  // 2. Create Default Lending Policy
  const policy = await prisma.lendingPolicyConfig.create({
    data: {
      policyName: 'Retail & Commercial Underwriting Policy 2024.2',
      description: 'Standard institutional retail lending guidelines with FOIR ceilings, CIBIL benchmarks, and multi-year ITR cross-verification rules.',
      maxFoirSalaried: 50.0,
      maxFoirSelfEmployed: 55.0,
      minCreditScore: 650,
      minAverageMonthlyBalance: 10000.0,
      baseInterestRate: 10.5,
      haircutUnverifiedIncome: 20.0,
      maxAllowedBouncesLast6Months: 1,
      isDefault: true,
    },
  });

  // Helper to generate transaction series
  function generateTransactions(config: {
    months: number;
    salaryOrDraw: number;
    salaryCategory: 'SALARY' | 'BUSINESS_CREDIT';
    salaryNarration: string;
    existingEmi: number;
    emiNarration: string;
    avgDebit: number;
    initialBalance: number;
    bounces?: { monthIndex: number; date: number; reason: string }[];
  }): ParsedTransaction[] {
    const txns: ParsedTransaction[] = [];
    let currentBalance = config.initialBalance;

    const today = new Date();

    for (let m = config.months - 1; m >= 0; m--) {
      const year = today.getFullYear();
      const month = today.getMonth() - m;
      const baseDate = new Date(year, month, 1);

      // 1st of month: Salary / Primary Credit
      currentBalance += config.salaryOrDraw;
      txns.push({
        date: new Date(year, month, 1, 10, 0),
        description: config.salaryNarration,
        amount: config.salaryOrDraw,
        type: 'CREDIT',
        category: config.salaryCategory,
        balanceAfter: currentBalance,
        isUnusual: false,
        isBounced: false,
      });

      // 5th of month: Existing EMI debit
      if (config.existingEmi > 0) {
        currentBalance -= config.existingEmi;
        txns.push({
          date: new Date(year, month, 5, 11, 30),
          description: config.emiNarration,
          amount: config.existingEmi,
          type: 'DEBIT',
          category: 'EMI_OUTFLOW',
          balanceAfter: currentBalance,
          isUnusual: false,
          isBounced: false,
        });
      }

      // 10th of month: Rent / Utilities
      const utilityAmt = Math.round(config.avgDebit * 0.3);
      currentBalance -= utilityAmt;
      txns.push({
        date: new Date(year, month, 10, 14, 0),
        description: 'UPI / BESCOM ELECTRICITY & BROADBAND',
        amount: utilityAmt,
        type: 'DEBIT',
        category: 'UTILITIES_RENT',
        balanceAfter: currentBalance,
        isUnusual: false,
        isBounced: false,
      });

      // Check for bounce in this month
      const monthBounce = config.bounces?.find((b) => b.monthIndex === m);
      if (monthBounce) {
        currentBalance -= 590; // Standard bank bounce penalty charge
        txns.push({
          date: new Date(year, month, monthBounce.date, 16, 0),
          description: `CHQ RET / NACH RETURN CHG - ${monthBounce.reason}`,
          amount: 590,
          type: 'DEBIT',
          category: 'BOUNCE_PENALTY',
          balanceAfter: currentBalance,
          isUnusual: true,
          isBounced: true,
          bounceReason: monthBounce.reason,
        });
      }

      // 20th of month: General Living / Groceries
      const groceryAmt = Math.round(config.avgDebit * 0.4);
      currentBalance -= groceryAmt;
      txns.push({
        date: new Date(year, month, 20, 19, 0),
        description: 'UPI / ZE PTO / SWIGGY / DMART RETAIL',
        amount: groceryAmt,
        type: 'DEBIT',
        category: 'OTHER',
        balanceAfter: currentBalance,
        isUnusual: false,
        isBounced: false,
      });

      // 28th of month: Misc debit
      const miscAmt = Math.round(config.avgDebit * 0.3);
      currentBalance -= miscAmt;
      txns.push({
        date: new Date(year, month, 28, 12, 0),
        description: 'ATM WDL / CASH WITHDRAWAL SELF',
        amount: miscAmt,
        type: 'DEBIT',
        category: 'CASH_WITHDRAWAL',
        balanceAfter: currentBalance,
        isUnusual: false,
        isBounced: false,
      });
    }

    return txns;
  }

  // -------------------------------------------------------------
  // CUSTOMER 1: Rajesh Sharma (Prime Salaried Executive)
  // -------------------------------------------------------------
  const cust1 = await prisma.customer.create({
    data: {
      fullName: 'Rajesh Sharma',
      email: 'rajesh.sharma@infosys.com',
      phone: '+91 98450 12345',
      panNumber: 'AAAPR1234K',
      aadhaarMasked: '•••• •••• 9812',
      dateOfBirth: '1984-06-15',
      employmentType: 'SALARIED',
      employerName: 'Infosys Limited',
      address: '402, Prestige Palms, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560066',
      creditScore: 785,
      requestedLoanAmount: 3500000,
      requestedLoanTenureMonths: 84,
      requestedLoanPurpose: 'Home Renovation & Solar Rooftop Installation',
      riskCategory: 'LOW_RISK',
      status: 'ACTIVE',
    },
  });

  // ITR Records for Rajesh (2 consecutive years, strong growth)
  const itr1_1: ParsedITR = {
    assessmentYear: 'AY 2024-25',
    financialYear: 'FY 2023-24',
    formType: 'ITR-1',
    filingDate: new Date('2024-07-22'),
    filingStatus: 'VERIFIED_FILED',
    acknowledgmentNumber: '109847120938475',
    grossTotalIncome: 2480000,
    taxableIncome: 2160000,
    salaryIncome: 2480000,
    businessProfessionIncome: 0,
    otherIncome: 0,
    chapterVIA_Deductions: 150000,
    totalTaxesPaid: 420000,
    refundOrPayable: 0,
    panNumber: 'AAAPR1234K',
    isVerified: true,
  };

  const itr1_2: ParsedITR = {
    assessmentYear: 'AY 2023-24',
    financialYear: 'FY 2022-23',
    formType: 'ITR-1',
    filingDate: new Date('2023-07-18'),
    filingStatus: 'VERIFIED_FILED',
    acknowledgmentNumber: '293847109283471',
    grossTotalIncome: 2150000,
    taxableIncome: 1890000,
    salaryIncome: 2150000,
    businessProfessionIncome: 0,
    otherIncome: 0,
    chapterVIA_Deductions: 150000,
    totalTaxesPaid: 340000,
    refundOrPayable: 0,
    panNumber: 'AAAPR1234K',
    isVerified: true,
  };

  await prisma.itrRecord.create({
    data: { customerId: cust1.id, ...itr1_1 },
  });
  await prisma.itrRecord.create({
    data: { customerId: cust1.id, ...itr1_2 },
  });

  // Bank Statement for Rajesh (HDFC Bank, 6 months)
  const txns1 = generateTransactions({
    months: 6,
    salaryOrDraw: 185000,
    salaryCategory: 'SALARY',
    salaryNarration: 'CMS/SALARY/INFOSYS LTD/EMP89410',
    existingEmi: 28500,
    emiNarration: 'ACH/HDFC BANK CAR LOAN EMI',
    avgDebit: 45000,
    initialBalance: 120000,
  });

  const analysis1 = analyzeBankTransactions(txns1, 'HDFC Bank', '•••• •••• 4892', 'SAVINGS');

  const stmt1 = await prisma.bankStatement.create({
    data: {
      customerId: cust1.id,
      bankName: analysis1.bankName,
      accountNumberMasked: analysis1.accountNumberMasked,
      accountType: analysis1.accountType,
      statementPeriodStart: analysis1.statementPeriodStart,
      statementPeriodEnd: analysis1.statementPeriodEnd,
      totalCredits: analysis1.totalCredits,
      totalDebits: analysis1.totalDebits,
      netCashflow: analysis1.netCashflow,
      averageMonthlyBalance: analysis1.averageMonthlyBalance,
      minMonthlyBalance: analysis1.minMonthlyBalance,
      maxMonthlyBalance: analysis1.maxMonthlyBalance,
      monthlySalaryDetected: analysis1.monthlySalaryDetected,
      recurringEmiDetected: analysis1.recurringEmiDetected,
      bounceCount: analysis1.bounceCount,
      unusualTransactionsCount: analysis1.unusualTransactionsCount,
      salaryConsistencyScore: analysis1.salaryConsistencyScore,
      fileFormat: 'CSV',
    },
  });

  for (const t of txns1) {
    await prisma.bankTransaction.create({
      data: {
        bankStatementId: stmt1.id,
        ...t,
      },
    });
  }

  // Run Credit Assessment for Rajesh
  const assessmentResult1 = runCreditAssessment(
    cust1,
    analysis1,
    [itr1_1, itr1_2],
    policy
  );

  await prisma.creditAssessment.create({
    data: {
      customerId: cust1.id,
      version: 1,
      status: 'APPROVED',
      verifiedMonthlyIncome: assessmentResult1.verifiedMonthlyIncome,
      existingDebtObligations: assessmentResult1.existingDebtObligations,
      netDisposableIncome: assessmentResult1.netDisposableIncome,
      dtiRatio: assessmentResult1.dtiRatio,
      foirRatio: assessmentResult1.foirRatio,
      affordableAdditionalEmi: assessmentResult1.affordableAdditionalEmi,
      requestedAmount: cust1.requestedLoanAmount,
      requestedTenureMonths: cust1.requestedLoanTenureMonths,
      interestRateAnnual: assessmentResult1.interestRateAnnual,
      calculatedMaxLoanPrincipal: assessmentResult1.calculatedMaxLoanPrincipal,
      calculatedEmi: assessmentResult1.calculatedEmi,
      totalInterestPayable: assessmentResult1.totalInterestPayable,
      totalRepaymentAmount: assessmentResult1.totalRepaymentAmount,
      riskGrade: assessmentResult1.riskGrade,
      positiveIndicators: JSON.stringify(assessmentResult1.positiveIndicators),
      riskFactors: JSON.stringify(assessmentResult1.riskFactors),
      incomeDiscrepancies: JSON.stringify(assessmentResult1.incomeDiscrepancies),
      missingDocuments: JSON.stringify(assessmentResult1.missingDocuments),
      calculationAssumptions: JSON.stringify(assessmentResult1.calculationAssumptions),
      recommendationReasoning: assessmentResult1.recommendationReasoning,
      conservativeScenario: JSON.stringify(assessmentResult1.conservativeScenario),
      standardScenario: JSON.stringify(assessmentResult1.standardScenario),
      aggressiveScenario: JSON.stringify(assessmentResult1.aggressiveScenario),
      aiExplanation: 'Prime Tier-1 salaried profile with Infosys. Flawless 6-month banking record without any dishonor penalties. 2-year ITR exhibits solid 15.3% YoY growth. Post-disbursement FOIR remains exceptionally safe at 32.5%. Sanctioned at preferential interest rate of 10.0%.',
      analystNotes: 'All KYC documents and Form 16 cross-verified against TRACES tax portal. Recommend full sanction.',
      approverNotes: 'Sanction approved as recommended by Chief Underwriting Officer.',
      decisionBy: approver.name,
      decisionDate: new Date(),
      approvedAmount: cust1.requestedLoanAmount,
      approvedTenureMonths: cust1.requestedLoanTenureMonths,
      approvedInterestRate: 10.0,
      decisionMakerId: approver.id,
    },
  });

  // -------------------------------------------------------------
  // CUSTOMER 2: Priya Patel (Growing Business Owner)
  // -------------------------------------------------------------
  const cust2 = await prisma.customer.create({
    data: {
      fullName: 'Priya Patel',
      email: 'priya@apexhealthsupplies.com',
      phone: '+91 97230 45678',
      panNumber: 'BPKPP5678L',
      aadhaarMasked: '•••• •••• 1245',
      dateOfBirth: '1989-11-20',
      employmentType: 'SELF_EMPLOYED_BUSINESS',
      businessName: 'Apex Healthcare Supplies LLP',
      address: 'Plot 48, GIDC Industrial Estate',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '382445',
      creditScore: 735,
      requestedLoanAmount: 2500000,
      requestedLoanTenureMonths: 60,
      requestedLoanPurpose: 'Medical Equipment & Working Capital Expansion',
      riskCategory: 'MODERATE_RISK',
      status: 'ACTIVE',
    },
  });

  const itr2_1: ParsedITR = {
    assessmentYear: 'AY 2024-25',
    financialYear: 'FY 2023-24',
    formType: 'ITR-3',
    filingDate: new Date('2024-10-15'),
    filingStatus: 'VERIFIED_FILED',
    acknowledgmentNumber: '394857102938475',
    grossTotalIncome: 1640000,
    taxableIncome: 1420000,
    salaryIncome: 0,
    businessProfessionIncome: 1640000,
    otherIncome: 0,
    chapterVIA_Deductions: 150000,
    totalTaxesPaid: 245000,
    refundOrPayable: 0,
    panNumber: 'BPKPP5678L',
    isVerified: true,
  };

  const itr2_2: ParsedITR = {
    assessmentYear: 'AY 2023-24',
    financialYear: 'FY 2022-23',
    formType: 'ITR-3',
    filingDate: new Date('2023-10-10'),
    filingStatus: 'VERIFIED_FILED',
    acknowledgmentNumber: '409182374918234',
    grossTotalIncome: 1350000,
    taxableIncome: 1180000,
    salaryIncome: 0,
    businessProfessionIncome: 1350000,
    otherIncome: 0,
    chapterVIA_Deductions: 150000,
    totalTaxesPaid: 185000,
    refundOrPayable: 0,
    panNumber: 'BPKPP5678L',
    isVerified: true,
  };

  await prisma.itrRecord.create({ data: { customerId: cust2.id, ...itr2_1 } });
  await prisma.itrRecord.create({ data: { customerId: cust2.id, ...itr2_2 } });

  const txns2 = generateTransactions({
    months: 6,
    salaryOrDraw: 380000, // Monthly business inflow
    salaryCategory: 'BUSINESS_CREDIT',
    salaryNarration: 'RTGS/HOSPITAL CLIENT SETTLEMENT/MED SUPPLY',
    existingEmi: 35000,
    emiNarration: 'NACH/ICICI BANK EQUIPMENT LOAN',
    avgDebit: 180000,
    initialBalance: 240000,
  });

  const analysis2 = analyzeBankTransactions(txns2, 'ICICI Bank', '•••• •••• 7731', 'CURRENT');

  const stmt2 = await prisma.bankStatement.create({
    data: {
      customerId: cust2.id,
      bankName: analysis2.bankName,
      accountNumberMasked: analysis2.accountNumberMasked,
      accountType: analysis2.accountType,
      statementPeriodStart: analysis2.statementPeriodStart,
      statementPeriodEnd: analysis2.statementPeriodEnd,
      totalCredits: analysis2.totalCredits,
      totalDebits: analysis2.totalDebits,
      netCashflow: analysis2.netCashflow,
      averageMonthlyBalance: analysis2.averageMonthlyBalance,
      minMonthlyBalance: analysis2.minMonthlyBalance,
      maxMonthlyBalance: analysis2.maxMonthlyBalance,
      monthlySalaryDetected: analysis2.monthlySalaryDetected,
      recurringEmiDetected: analysis2.recurringEmiDetected,
      bounceCount: analysis2.bounceCount,
      unusualTransactionsCount: analysis2.unusualTransactionsCount,
      salaryConsistencyScore: analysis2.salaryConsistencyScore,
      fileFormat: 'EXCEL',
    },
  });

  for (const t of txns2) {
    await prisma.bankTransaction.create({
      data: { bankStatementId: stmt2.id, ...t },
    });
  }

  const assessmentResult2 = runCreditAssessment(
    cust2,
    analysis2,
    [itr2_1, itr2_2],
    policy
  );

  await prisma.creditAssessment.create({
    data: {
      customerId: cust2.id,
      version: 1,
      status: 'PENDING_APPROVAL',
      verifiedMonthlyIncome: assessmentResult2.verifiedMonthlyIncome,
      existingDebtObligations: assessmentResult2.existingDebtObligations,
      netDisposableIncome: assessmentResult2.netDisposableIncome,
      dtiRatio: assessmentResult2.dtiRatio,
      foirRatio: assessmentResult2.foirRatio,
      affordableAdditionalEmi: assessmentResult2.affordableAdditionalEmi,
      requestedAmount: cust2.requestedLoanAmount,
      requestedTenureMonths: cust2.requestedLoanTenureMonths,
      interestRateAnnual: assessmentResult2.interestRateAnnual,
      calculatedMaxLoanPrincipal: assessmentResult2.calculatedMaxLoanPrincipal,
      calculatedEmi: assessmentResult2.calculatedEmi,
      totalInterestPayable: assessmentResult2.totalInterestPayable,
      totalRepaymentAmount: assessmentResult2.totalRepaymentAmount,
      riskGrade: assessmentResult2.riskGrade,
      positiveIndicators: JSON.stringify(assessmentResult2.positiveIndicators),
      riskFactors: JSON.stringify(assessmentResult2.riskFactors),
      incomeDiscrepancies: JSON.stringify(assessmentResult2.incomeDiscrepancies),
      missingDocuments: JSON.stringify(assessmentResult2.missingDocuments),
      calculationAssumptions: JSON.stringify(assessmentResult2.calculationAssumptions),
      recommendationReasoning: assessmentResult2.recommendationReasoning,
      conservativeScenario: JSON.stringify(assessmentResult2.conservativeScenario),
      standardScenario: JSON.stringify(assessmentResult2.standardScenario),
      aggressiveScenario: JSON.stringify(assessmentResult2.aggressiveScenario),
      aiExplanation: 'Viable commercial borrower in healthcare supplies. Strong 21.5% YoY taxable profit expansion. Clean banking history with zero clearing returns and healthy average balances. Recommended for sanction subject to hypothecation of procured medical machinery.',
      analystNotes: 'GST returns reconciled with bank turnover credits. Recommending sanction of ₹25,00,000 at 10.5%. Forwarded to Approver.',
    },
  });

  // -------------------------------------------------------------
  // CUSTOMER 3: Amit Verma (Self-Employed Consultant / Gig)
  // -------------------------------------------------------------
  const cust3 = await prisma.customer.create({
    data: {
      fullName: 'Amit Verma',
      email: 'amit.verma.cloud@gmail.com',
      phone: '+91 99100 78901',
      panNumber: 'ADVPA9012M',
      aadhaarMasked: '•••• •••• 4421',
      dateOfBirth: '1992-03-10',
      employmentType: 'SELF_EMPLOYED_PROFESSIONAL',
      businessName: 'Verma Cloud Architecture Consultancy',
      address: 'Tower 3, Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201309',
      creditScore: 685,
      requestedLoanAmount: 800000,
      requestedLoanTenureMonths: 36,
      requestedLoanPurpose: 'Workstation Setup & Cloud Certification Lab',
      riskCategory: 'MODERATE_RISK',
      status: 'ACTIVE',
    },
  });

  const itr3_1: ParsedITR = {
    assessmentYear: 'AY 2024-25',
    financialYear: 'FY 2023-24',
    formType: 'ITR-4',
    filingDate: new Date('2024-07-28'),
    filingStatus: 'VERIFIED_FILED',
    acknowledgmentNumber: '495820193847102',
    grossTotalIncome: 1120000,
    taxableIncome: 980000,
    salaryIncome: 0,
    businessProfessionIncome: 1120000,
    otherIncome: 0,
    chapterVIA_Deductions: 140000,
    totalTaxesPaid: 85000,
    refundOrPayable: 0,
    panNumber: 'ADVPA9012M',
    isVerified: true,
  };

  const itr3_2: ParsedITR = {
    assessmentYear: 'AY 2023-24',
    financialYear: 'FY 2022-23',
    formType: 'ITR-4',
    filingDate: new Date('2023-07-25'),
    filingStatus: 'VERIFIED_FILED',
    acknowledgmentNumber: '501928374102938',
    grossTotalIncome: 1090000,
    taxableIncome: 950000,
    salaryIncome: 0,
    businessProfessionIncome: 1090000,
    otherIncome: 0,
    chapterVIA_Deductions: 140000,
    totalTaxesPaid: 80000,
    refundOrPayable: 0,
    panNumber: 'ADVPA9012M',
    isVerified: true,
  };

  await prisma.itrRecord.create({ data: { customerId: cust3.id, ...itr3_1 } });
  await prisma.itrRecord.create({ data: { customerId: cust3.id, ...itr3_2 } });

  const txns3 = generateTransactions({
    months: 6,
    salaryOrDraw: 95000,
    salaryCategory: 'BUSINESS_CREDIT',
    salaryNarration: 'IMPS/OVERSEAS CLIENT INVOICE/CONSULTING',
    existingEmi: 18000,
    emiNarration: 'ACH/AXIS BANK PERSONAL LOAN',
    avgDebit: 45000,
    initialBalance: 35000,
    bounces: [
      { monthIndex: 3, date: 14, reason: 'Delayed Inward Client Clearing / ECS Dishonor' },
    ],
  });

  const analysis3 = analyzeBankTransactions(txns3, 'Axis Bank', '•••• •••• 9920', 'SAVINGS');

  const stmt3 = await prisma.bankStatement.create({
    data: {
      customerId: cust3.id,
      bankName: analysis3.bankName,
      accountNumberMasked: analysis3.accountNumberMasked,
      accountType: analysis3.accountType,
      statementPeriodStart: analysis3.statementPeriodStart,
      statementPeriodEnd: analysis3.statementPeriodEnd,
      totalCredits: analysis3.totalCredits,
      totalDebits: analysis3.totalDebits,
      netCashflow: analysis3.netCashflow,
      averageMonthlyBalance: analysis3.averageMonthlyBalance,
      minMonthlyBalance: analysis3.minMonthlyBalance,
      maxMonthlyBalance: analysis3.maxMonthlyBalance,
      monthlySalaryDetected: analysis3.monthlySalaryDetected,
      recurringEmiDetected: analysis3.recurringEmiDetected,
      bounceCount: analysis3.bounceCount,
      unusualTransactionsCount: analysis3.unusualTransactionsCount,
      salaryConsistencyScore: analysis3.salaryConsistencyScore,
      fileFormat: 'PDF',
    },
  });

  for (const t of txns3) {
    await prisma.bankTransaction.create({
      data: { bankStatementId: stmt3.id, ...t },
    });
  }

  const assessmentResult3 = runCreditAssessment(
    cust3,
    analysis3,
    [itr3_1, itr3_2],
    policy
  );

  await prisma.creditAssessment.create({
    data: {
      customerId: cust3.id,
      version: 1,
      status: 'REASSESSMENT_REQUESTED',
      verifiedMonthlyIncome: assessmentResult3.verifiedMonthlyIncome,
      existingDebtObligations: assessmentResult3.existingDebtObligations,
      netDisposableIncome: assessmentResult3.netDisposableIncome,
      dtiRatio: assessmentResult3.dtiRatio,
      foirRatio: assessmentResult3.foirRatio,
      affordableAdditionalEmi: assessmentResult3.affordableAdditionalEmi,
      requestedAmount: cust3.requestedLoanAmount,
      requestedTenureMonths: cust3.requestedLoanTenureMonths,
      interestRateAnnual: assessmentResult3.interestRateAnnual,
      calculatedMaxLoanPrincipal: assessmentResult3.calculatedMaxLoanPrincipal,
      calculatedEmi: assessmentResult3.calculatedEmi,
      totalInterestPayable: assessmentResult3.totalInterestPayable,
      totalRepaymentAmount: assessmentResult3.totalRepaymentAmount,
      riskGrade: assessmentResult3.riskGrade,
      positiveIndicators: JSON.stringify(assessmentResult3.positiveIndicators),
      riskFactors: JSON.stringify(assessmentResult3.riskFactors),
      incomeDiscrepancies: JSON.stringify(assessmentResult3.incomeDiscrepancies),
      missingDocuments: JSON.stringify(assessmentResult3.missingDocuments),
      calculationAssumptions: JSON.stringify(assessmentResult3.calculationAssumptions),
      recommendationReasoning: assessmentResult3.recommendationReasoning,
      conservativeScenario: JSON.stringify(assessmentResult3.conservativeScenario),
      standardScenario: JSON.stringify(assessmentResult3.standardScenario),
      aggressiveScenario: JSON.stringify(assessmentResult3.aggressiveScenario),
      aiExplanation: 'Self-employed IT consultant. Income meets baseline criteria under Section 44ADA presumptive taxation. However, 1 inward clearing return recorded 3 months ago due to client settlement timing. Sanction conditioned on auto-debit NACH mandate and reduced loan ticket of ₹6,50,000.',
      analystNotes: 'Client provided invoice corroboration for the temporary bounce. Requires sanction committee review.',
      approverNotes: 'Please verify if client can provide 3 months of latest consulting service agreements before final approval.',
    },
  });

  // -------------------------------------------------------------
  // CUSTOMER 4: Neha Gupta (High Risk Overleveraged Applicant)
  // -------------------------------------------------------------
  const cust4 = await prisma.customer.create({
    data: {
      fullName: 'Neha Gupta',
      email: 'neha.gupta.sales@hotmail.com',
      phone: '+91 98111 23456',
      panNumber: 'ANGPG3456N',
      aadhaarMasked: '•••• •••• 5567',
      dateOfBirth: '1995-08-25',
      employmentType: 'SALARIED',
      employerName: 'Horizon Retail Distribution Pvt Ltd',
      address: 'Flat 12B, Green Meadows',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110025',
      creditScore: 618,
      requestedLoanAmount: 1200000,
      requestedLoanTenureMonths: 48,
      requestedLoanPurpose: 'Debt Consolidation & Credit Card Balance Transfer',
      riskCategory: 'CRITICAL',
      status: 'ACTIVE',
    },
  });

  const itr4_1: ParsedITR = {
    assessmentYear: 'AY 2024-25',
    financialYear: 'FY 2023-24',
    formType: 'ITR-1',
    filingDate: new Date('2024-07-30'),
    filingStatus: 'VERIFIED_FILED',
    acknowledgmentNumber: '582910394857102',
    grossTotalIncome: 780000,
    taxableIncome: 720000,
    salaryIncome: 780000,
    businessProfessionIncome: 0,
    otherIncome: 0,
    chapterVIA_Deductions: 60000,
    totalTaxesPaid: 25000,
    refundOrPayable: 0,
    panNumber: 'ANGPG3456N',
    isVerified: true,
  };

  // Note: Only 1 year of ITR uploaded (Missing 2nd year ITR gap)
  await prisma.itrRecord.create({ data: { customerId: cust4.id, ...itr4_1 } });

  const txns4 = generateTransactions({
    months: 6,
    salaryOrDraw: 65000,
    salaryCategory: 'SALARY',
    salaryNarration: 'SAL/HORIZON RETAIL/PAYROLL-OCT',
    existingEmi: 44000, // 67.7% FOIR!
    emiNarration: 'NACH/BAJAJ FIN + SBI PL + HDFC CARD EMI',
    avgDebit: 20000,
    initialBalance: 8000,
    bounces: [
      { monthIndex: 1, date: 5, reason: 'Insufficient Funds / NACH Mandate Failed' },
      { monthIndex: 3, date: 5, reason: 'Cheque Return / Inward Clearing Failure' },
      { monthIndex: 5, date: 5, reason: 'ECS Mandate Dishonor Charge' },
    ],
  });

  const analysis4 = analyzeBankTransactions(txns4, 'State Bank of India', '•••• •••• 3341', 'SAVINGS');

  const stmt4 = await prisma.bankStatement.create({
    data: {
      customerId: cust4.id,
      bankName: analysis4.bankName,
      accountNumberMasked: analysis4.accountNumberMasked,
      accountType: analysis4.accountType,
      statementPeriodStart: analysis4.statementPeriodStart,
      statementPeriodEnd: analysis4.statementPeriodEnd,
      totalCredits: analysis4.totalCredits,
      totalDebits: analysis4.totalDebits,
      netCashflow: analysis4.netCashflow,
      averageMonthlyBalance: analysis4.averageMonthlyBalance,
      minMonthlyBalance: analysis4.minMonthlyBalance,
      maxMonthlyBalance: analysis4.maxMonthlyBalance,
      monthlySalaryDetected: analysis4.monthlySalaryDetected,
      recurringEmiDetected: analysis4.recurringEmiDetected,
      bounceCount: analysis4.bounceCount,
      unusualTransactionsCount: analysis4.unusualTransactionsCount,
      salaryConsistencyScore: analysis4.salaryConsistencyScore,
      fileFormat: 'CSV',
    },
  });

  for (const t of txns4) {
    await prisma.bankTransaction.create({
      data: { bankStatementId: stmt4.id, ...t },
    });
  }

  const assessmentResult4 = runCreditAssessment(
    cust4,
    analysis4,
    [itr4_1], // Missing 2nd year!
    policy
  );

  await prisma.creditAssessment.create({
    data: {
      customerId: cust4.id,
      version: 1,
      status: 'REJECTED',
      verifiedMonthlyIncome: assessmentResult4.verifiedMonthlyIncome,
      existingDebtObligations: assessmentResult4.existingDebtObligations,
      netDisposableIncome: assessmentResult4.netDisposableIncome,
      dtiRatio: assessmentResult4.dtiRatio,
      foirRatio: assessmentResult4.foirRatio,
      affordableAdditionalEmi: assessmentResult4.affordableAdditionalEmi,
      requestedAmount: cust4.requestedLoanAmount,
      requestedTenureMonths: cust4.requestedLoanTenureMonths,
      interestRateAnnual: assessmentResult4.interestRateAnnual,
      calculatedMaxLoanPrincipal: assessmentResult4.calculatedMaxLoanPrincipal,
      calculatedEmi: assessmentResult4.calculatedEmi,
      totalInterestPayable: assessmentResult4.totalInterestPayable,
      totalRepaymentAmount: assessmentResult4.totalRepaymentAmount,
      riskGrade: assessmentResult4.riskGrade,
      positiveIndicators: JSON.stringify(assessmentResult4.positiveIndicators),
      riskFactors: JSON.stringify(assessmentResult4.riskFactors),
      incomeDiscrepancies: JSON.stringify(assessmentResult4.incomeDiscrepancies),
      missingDocuments: JSON.stringify(assessmentResult4.missingDocuments),
      calculationAssumptions: JSON.stringify(assessmentResult4.calculationAssumptions),
      recommendationReasoning: assessmentResult4.recommendationReasoning,
      conservativeScenario: JSON.stringify(assessmentResult4.conservativeScenario),
      standardScenario: JSON.stringify(assessmentResult4.standardScenario),
      aggressiveScenario: JSON.stringify(assessmentResult4.aggressiveScenario),
      aiExplanation: 'Application rejected due to severe debt overleverage. Existing fixed debt commitments of ₹44,000 consume 67.7% of verified salary, exceeding the 50% retail policy limit. Furthermore, 3 separate clearing returns recorded over the past 6 months combined with a sub-650 credit score pose an unacceptable default probability.',
      analystNotes: 'Customer is seeking debt consolidation, but cash flow does not support fresh borrowing without co-borrower and full foreclosure of existing obligations.',
      approverNotes: 'Sanction rejected as per Risk & Credit Committee prudential norms.',
      decisionBy: approver.name,
      decisionDate: new Date(),
      decisionMakerId: approver.id,
    },
  });

  // Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        userName: admin.name,
        userRole: admin.role,
        action: 'POLICY_CONFIGURED',
        entityType: 'LendingPolicy',
        entityId: policy.id,
        details: 'Initialized Retail Underwriting Policy 2024.2 with 50% Salaried FOIR and 650 CIBIL threshold',
      },
      {
        userId: analyst.id,
        userName: analyst.name,
        userRole: analyst.role,
        action: 'CUSTOMER_CREATED',
        entityType: 'Customer',
        entityId: cust1.id,
        details: 'Registered customer profile for Rajesh Sharma with requested ₹35,00,000 facility',
      },
      {
        userId: analyst.id,
        userName: analyst.name,
        userRole: analyst.role,
        action: 'ASSESSMENT_RUN',
        entityType: 'CreditAssessment',
        entityId: cust1.id,
        details: 'Calculated explainable credit capacity for Rajesh Sharma: Risk Grade PRIME_A, Affordable EMI ₹45,000',
      },
      {
        userId: approver.id,
        userName: approver.name,
        userRole: approver.role,
        action: 'LOAN_APPROVED',
        entityType: 'CreditAssessment',
        entityId: cust1.id,
        details: 'Approved ₹35,00,000 Home Renovation Facility for Rajesh Sharma at 10.0% p.a. for 84 months',
      },
      {
        userId: approver.id,
        userName: approver.name,
        userRole: approver.role,
        action: 'LOAN_REJECTED',
        entityType: 'CreditAssessment',
        entityId: cust4.id,
        details: 'Rejected ₹12,00,000 loan request for Neha Gupta due to 67.7% FOIR overleverage and 3 cheque return charges',
      },
    ],
  });

  console.log('Seeding completed successfully! 4 distinct real-world banking personas initialized.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
