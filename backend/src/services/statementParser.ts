import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

export interface ParsedTransaction {
  date: Date;
  description: string;
  referenceNo?: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  category: 'SALARY' | 'BUSINESS_CREDIT' | 'EMI_OUTFLOW' | 'INVESTMENT' | 'UTILITIES_RENT' | 'CASH_WITHDRAWAL' | 'CASH_DEPOSIT' | 'BOUNCE_PENALTY' | 'OTHER';
  balanceAfter?: number;
  isUnusual: boolean;
  isBounced: boolean;
  bounceReason?: string;
  notes?: string;
}

export interface MonthlyBreakdown {
  month: string; // YYYY-MM
  monthLabel: string; // e.g. "Apr 2024"
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

export interface StatementAnalysisResult {
  bankName: string;
  accountNumberMasked: string;
  accountType: 'SAVINGS' | 'CURRENT';
  statementPeriodStart: Date;
  statementPeriodEnd: Date;
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
  detectedEmis: DetectedEMI[];
  monthlyBreakdowns: MonthlyBreakdown[];
  transactions: ParsedTransaction[];
}

/**
 * Categorize transaction based on standard Indian banking narration keywords
 */
export function categorizeTransaction(description: string, type: 'CREDIT' | 'DEBIT', amount: number): {
  category: ParsedTransaction['category'];
  isBounced: boolean;
  bounceReason?: string;
} {
  const desc = description.toUpperCase();

  // 1. Cheque Bounces & NACH Debit Returns
  if (
    desc.includes('CHQ RET') ||
    desc.includes('CHEQUE RET') ||
    desc.includes('INWARD RET') ||
    desc.includes('ECS RET') ||
    desc.includes('NACH RET') ||
    desc.includes('BOUNCE') ||
    desc.includes('DISHONOUR') ||
    desc.includes('UNPAID') ||
    desc.includes('INSUFFICIENT FUND') ||
    desc.includes('RETURN CHG') ||
    desc.includes('PENAL CHG')
  ) {
    let reason = 'Inward Clearing / ECS Debit Return';
    if (desc.includes('INSUFFICIENT')) reason = 'Insufficient Funds';
    if (desc.includes('NACH')) reason = 'NACH Mandate Failed';
    if (desc.includes('CHQ')) reason = 'Cheque Return Penalty';
    return {
      category: 'BOUNCE_PENALTY',
      isBounced: true,
      bounceReason: reason,
    };
  }

  // 2. Salary Credits
  if (type === 'CREDIT') {
    if (
      desc.includes('SALARY') ||
      desc.includes('SAL/') ||
      desc.includes('PAYROLL') ||
      desc.includes('CMS/SAL') ||
      desc.includes('NEFT/SAL') ||
      desc.includes('CORP SAL') ||
      desc.includes('MONTHLY SAL') ||
      desc.includes('INFOSYS') ||
      desc.includes('TCS') ||
      desc.includes('WIPRO') ||
      desc.includes('HCL') ||
      desc.includes('TECH M') ||
      desc.includes('ACCENTURE') ||
      desc.includes('GOOGLE') ||
      desc.includes('MICROSOFT')
    ) {
      return { category: 'SALARY', isBounced: false };
    }

    if (desc.includes('CASH DEP') || desc.includes('CDM/') || desc.includes('BY CASH')) {
      return { category: 'CASH_DEPOSIT', isBounced: false };
    }

    if (
      desc.includes('UPI/QR') ||
      desc.includes('MERCHANT') ||
      desc.includes('SWIPE') ||
      desc.includes('SETTLEMENT') ||
      desc.includes('CLIENT') ||
      desc.includes('INVOICE') ||
      desc.includes('RAZORPAY') ||
      desc.includes('PAYTM QR') ||
      desc.includes('BHARATPE')
    ) {
      return { category: 'BUSINESS_CREDIT', isBounced: false };
    }

    if (desc.includes('DIVIDEND') || desc.includes('MF/') || desc.includes('INTEREST') || desc.includes('INT.PD')) {
      return { category: 'INVESTMENT', isBounced: false };
    }

    return { category: 'BUSINESS_CREDIT', isBounced: false };
  }

  // 3. Debits: EMI Outflows
  if (type === 'DEBIT') {
    if (
      desc.includes('ACH/') ||
      desc.includes('NACH/') ||
      desc.includes('ECS/') ||
      desc.includes('EMI') ||
      desc.includes('LOAN') ||
      desc.includes('HDFC BANK') ||
      desc.includes('BAJAJ') ||
      desc.includes('SBI HL') ||
      desc.includes('ICICI LOAN') ||
      desc.includes('KOTAK MAH') ||
      desc.includes('AXIS BK') ||
      desc.includes('TATA CAP') ||
      desc.includes('PIRAMAL') ||
      desc.includes('CHOLA') ||
      desc.includes('HERO FIN') ||
      desc.includes('MUTHOOT')
    ) {
      return { category: 'EMI_OUTFLOW', isBounced: false };
    }

    if (
      desc.includes('RENT') ||
      desc.includes('LANDLORD') ||
      desc.includes('ELECTRICITY') ||
      desc.includes('BESCOM') ||
      desc.includes('TNEB') ||
      desc.includes('MAHAVITARAN') ||
      desc.includes('GAS') ||
      desc.includes('BROADBAND') ||
      desc.includes('AIRTEL') ||
      desc.includes('JIO FIBER')
    ) {
      return { category: 'UTILITIES_RENT', isBounced: false };
    }

    if (desc.includes('ATM WDL') || desc.includes('CASH WDL') || desc.includes('SELF CHQ')) {
      return { category: 'CASH_WITHDRAWAL', isBounced: false };
    }

    if (desc.includes('SIP') || desc.includes('ZERODHA') || desc.includes('GROWW') || desc.includes('MUTUAL FUND')) {
      return { category: 'INVESTMENT', isBounced: false };
    }

    return { category: 'OTHER', isBounced: false };
  }

  return { category: 'OTHER', isBounced: false };
}

/**
 * Determine if transaction is unusually large or abnormal
 */
export function isUnusualTransaction(amount: number, type: 'CREDIT' | 'DEBIT', category: string): boolean {
  // Cash deposit over ₹50,000 requires PAN reporting in India, unusual for retail
  if (category === 'CASH_DEPOSIT' && amount >= 50000) return true;
  // Sudden credit or debit exceeding ₹2,50,000 for retail accounts
  if (amount >= 250000 && category !== 'SALARY') return true;
  return false;
}

/**
 * Detect recurring EMIs from transaction history
 */
export function identifyRecurringEMIs(transactions: ParsedTransaction[]): DetectedEMI[] {
  const emiDebits = transactions.filter((t) => t.category === 'EMI_OUTFLOW' && t.type === 'DEBIT');
  const amountGroups: { [amountKey: string]: { narration: string; count: number; amount: number } } = {};

  for (const t of emiDebits) {
    // Group within ₹100 tolerance for rounding
    const key = Math.round(t.amount / 100) * 100;
    if (!amountGroups[key]) {
      amountGroups[key] = {
        narration: t.description.slice(0, 30),
        count: 1,
        amount: t.amount,
      };
    } else {
      amountGroups[key].count += 1;
    }
  }

  const results: DetectedEMI[] = [];
  for (const key of Object.keys(amountGroups)) {
    const group = amountGroups[key];
    // If debited at least 2 times, consider it recurring
    if (group.count >= 2) {
      results.push({
        lenderOrNarration: group.narration,
        amount: group.amount,
        frequency: 'Monthly',
        detectedCount: group.count,
      });
    }
  }

  return results;
}

/**
 * Parse Bank Statement from CSV buffer or string
 */
export async function parseStatementCSV(buffer: Buffer): Promise<ParsedTransaction[]> {
  const results: any[] = [];
  const stream = Readable.from(buffer.toString('utf-8'));

  await new Promise((resolve, reject) => {
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  const parsedTransactions: ParsedTransaction[] = [];

  for (const row of results) {
    const keys = Object.keys(row);
    // Find matching columns
    const dateKey = keys.find((k) => /date|txn.?date|val.?date/i.test(k));
    const descKey = keys.find((k) => /narration|desc|particular|details/i.test(k));
    const refKey = keys.find((k) => /ref|chq|cheque|utr/i.test(k));
    const debitKey = keys.find((k) => /debit|withdrawal|dr/i.test(k));
    const creditKey = keys.find((k) => /credit|deposit|cr/i.test(k));
    const balanceKey = keys.find((k) => /balance|bal/i.test(k));

    const dateStr = dateKey ? row[dateKey] : '';
    const descStr = descKey ? row[descKey] : 'Transaction';
    const refStr = refKey ? row[refKey] : undefined;

    const debitVal = debitKey && row[debitKey] ? parseFloat(String(row[debitKey]).replace(/,/g, '')) : 0;
    const creditVal = creditKey && row[creditKey] ? parseFloat(String(row[creditKey]).replace(/,/g, '')) : 0;
    const balanceVal = balanceKey && row[balanceKey] ? parseFloat(String(row[balanceKey]).replace(/,/g, '')) : undefined;

    const isCredit = creditVal > 0;
    const amount = isCredit ? creditVal : (debitVal || 0);
    const type: 'CREDIT' | 'DEBIT' = isCredit ? 'CREDIT' : 'DEBIT';

    if (amount <= 0 && isNaN(debitVal) && isNaN(creditVal)) continue;

    const parsedDate = new Date(dateStr);
    const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const { category, isBounced, bounceReason } = categorizeTransaction(descStr, type, amount);
    const unusual = isUnusualTransaction(amount, type, category);

    parsedTransactions.push({
      date: validDate,
      description: descStr,
      referenceNo: refStr,
      amount,
      type,
      category,
      balanceAfter: balanceVal,
      isUnusual: unusual,
      isBounced,
      bounceReason,
    });
  }

  return parsedTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Parse Bank Statement from Excel (.xlsx/.xls) buffer
 */
export function parseStatementExcel(buffer: Buffer): ParsedTransaction[] {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const parsedTransactions: ParsedTransaction[] = [];

  for (const row of rawRows) {
    const keys = Object.keys(row);
    const dateKey = keys.find((k) => /date|txn.?date|val.?date/i.test(k));
    const descKey = keys.find((k) => /narration|desc|particular|details/i.test(k));
    const refKey = keys.find((k) => /ref|chq|cheque|utr/i.test(k));
    const debitKey = keys.find((k) => /debit|withdrawal|dr/i.test(k));
    const creditKey = keys.find((k) => /credit|deposit|cr/i.test(k));
    const balanceKey = keys.find((k) => /balance|bal/i.test(k));

    if (!descKey && !dateKey) continue;

    const dateVal = dateKey ? row[dateKey] : new Date();
    const descVal = descKey ? String(row[descKey]) : 'Bank Transaction';
    const refVal = refKey ? String(row[refKey]) : undefined;

    const debitVal = debitKey && row[debitKey] !== '' ? parseFloat(String(row[debitKey]).replace(/,/g, '')) : 0;
    const creditVal = creditKey && row[creditKey] !== '' ? parseFloat(String(row[creditKey]).replace(/,/g, '')) : 0;
    const balanceVal = balanceKey && row[balanceKey] !== '' ? parseFloat(String(row[balanceKey]).replace(/,/g, '')) : undefined;

    const isCredit = creditVal > 0;
    const amount = isCredit ? creditVal : (debitVal || 0);
    const type: 'CREDIT' | 'DEBIT' = isCredit ? 'CREDIT' : 'DEBIT';

    if (amount <= 0 && isNaN(debitVal) && isNaN(creditVal)) continue;

    let validDate: Date;
    if (dateVal instanceof Date) {
      validDate = dateVal;
    } else {
      const parsed = new Date(dateVal);
      validDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    const { category, isBounced, bounceReason } = categorizeTransaction(descVal, type, amount);
    const unusual = isUnusualTransaction(amount, type, category);

    parsedTransactions.push({
      date: validDate,
      description: descVal,
      referenceNo: refVal,
      amount,
      type,
      category,
      balanceAfter: balanceVal,
      isUnusual: unusual,
      isBounced,
      bounceReason,
    });
  }

  return parsedTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Parse Bank Statement from PDF or Text buffer
 * Uses robust regex pattern matching for transaction lines (Date, Description, Ref, Dr, Cr, Bal)
 */
export function parseStatementText(content: string): ParsedTransaction[] {
  const lines = content.split('\n');
  const transactions: ParsedTransaction[] = [];

  // Common Indian statement date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const dateRegex = /^(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(dateRegex);
    if (match) {
      const datePart = match[1];
      // Format to Date object
      let dateObj = new Date(datePart);
      if (datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts[0].length === 2 && parts[2].length === 4) {
          // DD/MM/YYYY
          dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      // Check numbers at end of line (Debit, Credit, Balance)
      const rest = trimmed.substring(match[0].length).trim();
      const numberMatches = rest.match(/[\d,]+\.\d{2}/g);

      if (numberMatches && numberMatches.length >= 1) {
        let amount = 0;
        let type: 'CREDIT' | 'DEBIT' = 'DEBIT';
        let balance: number | undefined = undefined;

        if (numberMatches.length >= 2) {
          balance = parseFloat(numberMatches[numberMatches.length - 1].replace(/,/g, ''));
          amount = parseFloat(numberMatches[numberMatches.length - 2].replace(/,/g, ''));
        } else {
          amount = parseFloat(numberMatches[0].replace(/,/g, ''));
        }

        const isCredit = /CR|CREDIT|DEPOSIT|SALARY/i.test(rest);
        type = isCredit ? 'CREDIT' : 'DEBIT';

        const description = rest.replace(/[\d,]+\.\d{2}/g, '').trim();
        const { category, isBounced, bounceReason } = categorizeTransaction(description, type, amount);

        transactions.push({
          date: isNaN(dateObj.getTime()) ? new Date() : dateObj,
          description: description || 'Bank Transaction',
          amount,
          type,
          category,
          balanceAfter: balance,
          isUnusual: isUnusualTransaction(amount, type, category),
          isBounced,
          bounceReason,
        });
      }
    }
  }

  return transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Perform comprehensive banking analysis on extracted transactions
 */
export function analyzeBankTransactions(
  transactions: ParsedTransaction[],
  bankName: string = 'HDFC Bank',
  accountNumberMasked: string = '•••• •••• 4892',
  accountType: 'SAVINGS' | 'CURRENT' = 'SAVINGS'
): StatementAnalysisResult {
  if (transactions.length === 0) {
    const now = new Date();
    return {
      bankName,
      accountNumberMasked,
      accountType,
      statementPeriodStart: now,
      statementPeriodEnd: now,
      totalCredits: 0,
      totalDebits: 0,
      netCashflow: 0,
      averageMonthlyBalance: 0,
      minMonthlyBalance: 0,
      maxMonthlyBalance: 0,
      monthlySalaryDetected: 0,
      recurringEmiDetected: 0,
      bounceCount: 0,
      unusualTransactionsCount: 0,
      salaryConsistencyScore: 0,
      detectedEmis: [],
      monthlyBreakdowns: [],
      transactions: [],
    };
  }

  let totalCredits = 0;
  let totalDebits = 0;
  let bounceCount = 0;
  let unusualCount = 0;

  const monthlyMap: {
    [key: string]: {
      credits: number;
      debits: number;
      balances: number[];
      salaryCredits: number[];
      count: number;
    };
  } = {};

  for (const t of transactions) {
    if (t.type === 'CREDIT') totalCredits += t.amount;
    if (t.type === 'DEBIT') totalDebits += t.amount;
    if (t.isBounced) bounceCount += 1;
    if (t.isUnusual) unusualCount += 1;

    const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        credits: 0,
        debits: 0,
        balances: [],
        salaryCredits: [],
        count: 0,
      };
    }

    monthlyMap[monthKey].count += 1;
    if (t.type === 'CREDIT') {
      monthlyMap[monthKey].credits += t.amount;
      if (t.category === 'SALARY') {
        monthlyMap[monthKey].salaryCredits.push(t.amount);
      }
    } else {
      monthlyMap[monthKey].debits += t.amount;
    }

    if (t.balanceAfter !== undefined && !isNaN(t.balanceAfter)) {
      monthlyMap[monthKey].balances.push(t.balanceAfter);
    }
  }

  // Monthly breakdowns
  const sortedMonthKeys = Object.keys(monthlyMap).sort();
  const monthlyBreakdowns: MonthlyBreakdown[] = sortedMonthKeys.map((key) => {
    const data = monthlyMap[key];
    const [year, month] = key.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const closingBalance = data.balances.length > 0 ? data.balances[data.balances.length - 1] : 0;

    return {
      month: key,
      monthLabel,
      totalCredits: Math.round(data.credits * 100) / 100,
      totalDebits: Math.round(data.debits * 100) / 100,
      netCashflow: Math.round((data.credits - data.debits) * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      transactionCount: data.count,
    };
  });

  // Calculate balances across entire period
  const allBalances = transactions
    .filter((t) => t.balanceAfter !== undefined && !isNaN(t.balanceAfter))
    .map((t) => t.balanceAfter as number);

  const averageMonthlyBalance =
    allBalances.length > 0
      ? Math.round(allBalances.reduce((sum, b) => sum + b, 0) / allBalances.length)
      : Math.round(totalCredits / (sortedMonthKeys.length || 1) * 0.25);

  const minMonthlyBalance = allBalances.length > 0 ? Math.min(...allBalances) : 0;
  const maxMonthlyBalance = allBalances.length > 0 ? Math.max(...allBalances) : 0;

  // Detect recurring EMIs
  const detectedEmis = identifyRecurringEMIs(transactions);
  const recurringEmiDetected = detectedEmis.reduce((sum, e) => sum + e.amount, 0);

  // Detect Salary Consistency
  const salaryAmounts = transactions
    .filter((t) => t.category === 'SALARY')
    .map((t) => t.amount);

  let monthlySalaryDetected = 0;
  let salaryConsistencyScore = 100;

  if (salaryAmounts.length > 0) {
    const sumSalary = salaryAmounts.reduce((a, b) => a + b, 0);
    monthlySalaryDetected = Math.round(sumSalary / salaryAmounts.length);

    // Calculate Coefficient of Variation (CV = sigma / mean)
    const variance =
      salaryAmounts.reduce((acc, val) => acc + Math.pow(val - monthlySalaryDetected, 2), 0) /
      salaryAmounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = monthlySalaryDetected > 0 ? stdDev / monthlySalaryDetected : 0;

    // Consistency score: 100% minus variance penalty (up to 40% penalty for volatile income)
    salaryConsistencyScore = Math.max(60, Math.min(100, Math.round((1 - cv) * 100)));
  } else {
    // If business account, calculate monthly credit consistency
    const monthlyCreditsList = sortedMonthKeys.map((k) => monthlyMap[k].credits);
    if (monthlyCreditsList.length > 1) {
      const avgMonthlyCredit = monthlyCreditsList.reduce((a, b) => a + b, 0) / monthlyCreditsList.length;
      const variance =
        monthlyCreditsList.reduce((acc, val) => acc + Math.pow(val - avgMonthlyCredit, 2), 0) /
        monthlyCreditsList.length;
      const cv = avgMonthlyCredit > 0 ? Math.sqrt(variance) / avgMonthlyCredit : 0.5;
      salaryConsistencyScore = Math.max(50, Math.min(100, Math.round((1 - cv * 0.8) * 100)));
      monthlySalaryDetected = Math.round(avgMonthlyCredit * 0.35); // Estimated net business draw
    }
  }

  const statementPeriodStart = transactions[0].date;
  const statementPeriodEnd = transactions[transactions.length - 1].date;

  return {
    bankName,
    accountNumberMasked,
    accountType,
    statementPeriodStart,
    statementPeriodEnd,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    netCashflow: Math.round((totalCredits - totalDebits) * 100) / 100,
    averageMonthlyBalance,
    minMonthlyBalance,
    maxMonthlyBalance,
    monthlySalaryDetected,
    recurringEmiDetected,
    bounceCount,
    unusualTransactionsCount: unusualCount,
    salaryConsistencyScore,
    detectedEmis,
    monthlyBreakdowns,
    transactions,
  };
}
