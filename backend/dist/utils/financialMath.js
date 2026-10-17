import { Decimal } from 'decimal.js';
// Configure Decimal precision for banking standards
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
/**
 * Standard Equated Monthly Installment (EMI) Formula:
 * EMI = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
 * where:
 *   P = Principal loan amount
 *   r = Monthly interest rate (Annual Rate / 12 / 100)
 *   n = Number of monthly installments
 */
export function calculateEMI(principal, annualRatePct, tenureMonths) {
    if (principal <= 0 || tenureMonths <= 0)
        return 0;
    if (annualRatePct <= 0) {
        return new Decimal(principal).dividedBy(tenureMonths).toDecimalPlaces(2).toNumber();
    }
    const P = new Decimal(principal);
    const monthlyRate = new Decimal(annualRatePct).dividedBy(12).dividedBy(100);
    const n = new Decimal(tenureMonths);
    // (1 + r)^n
    const onePlusRPowN = new Decimal(1).plus(monthlyRate).pow(n);
    // Numerator: P * r * (1 + r)^n
    const numerator = P.times(monthlyRate).times(onePlusRPowN);
    // Denominator: (1 + r)^n - 1
    const denominator = onePlusRPowN.minus(1);
    if (denominator.isZero())
        return 0;
    const emi = numerator.dividedBy(denominator);
    return emi.toDecimalPlaces(2).toNumber();
}
/**
 * Inverse EMI Formula: Calculate Maximum Affordable Principal
 * P = [EMI * ((1 + r)^n - 1)] / [r * (1 + r)^n]
 */
export function calculateMaxLoanPrincipal(affordableMonthlyEmi, annualRatePct, tenureMonths) {
    if (affordableMonthlyEmi <= 0 || tenureMonths <= 0)
        return 0;
    if (annualRatePct <= 0) {
        return new Decimal(affordableMonthlyEmi).times(tenureMonths).toDecimalPlaces(2).toNumber();
    }
    const EMI = new Decimal(affordableMonthlyEmi);
    const monthlyRate = new Decimal(annualRatePct).dividedBy(12).dividedBy(100);
    const n = new Decimal(tenureMonths);
    const onePlusRPowN = new Decimal(1).plus(monthlyRate).pow(n);
    const numerator = EMI.times(onePlusRPowN.minus(1));
    const denominator = monthlyRate.times(onePlusRPowN);
    if (denominator.isZero())
        return 0;
    const principal = numerator.dividedBy(denominator);
    // Round to nearest 10,000 for realistic commercial loan underwriting
    const roundedPrincipal = principal.dividedBy(10000).floor().times(10000);
    return roundedPrincipal.toDecimalPlaces(2).toNumber();
}
/**
 * Fixed Obligation to Income Ratio (FOIR):
 * FOIR = (Total Existing Monthly EMIs + New Monthly EMI) / Gross Verified Monthly Income * 100
 */
export function calculateFOIR(totalMonthlyObligations, verifiedMonthlyIncome) {
    if (verifiedMonthlyIncome <= 0)
        return 100.0;
    const obligations = new Decimal(totalMonthlyObligations);
    const income = new Decimal(verifiedMonthlyIncome);
    return obligations.dividedBy(income).times(100).toDecimalPlaces(2).toNumber();
}
/**
 * Debt-to-Income (DTI) Ratio:
 * Annual Debt Servicing / Annual Verified Income * 100
 */
export function calculateDTI(annualDebtPayments, annualVerifiedIncome) {
    if (annualVerifiedIncome <= 0)
        return 100.0;
    const debt = new Decimal(annualDebtPayments);
    const income = new Decimal(annualVerifiedIncome);
    return debt.dividedBy(income).times(100).toDecimalPlaces(2).toNumber();
}
/**
 * Affordable Additional EMI based on Max Permissible FOIR:
 * Max Permissible EMI = (Verified Income * Max FOIR %) - Existing EMIs
 */
export function calculateAffordableAdditionalEmi(verifiedMonthlyIncome, existingMonthlyObligations, maxFoirPct) {
    if (verifiedMonthlyIncome <= 0)
        return 0;
    const income = new Decimal(verifiedMonthlyIncome);
    const existing = new Decimal(existingMonthlyObligations);
    const maxFoir = new Decimal(maxFoirPct).dividedBy(100);
    const maxTotalEmiAllowed = income.times(maxFoir);
    const affordableAdditional = maxTotalEmiAllowed.minus(existing);
    if (affordableAdditional.lessThan(0)) {
        return 0;
    }
    return affordableAdditional.toDecimalPlaces(2).toNumber();
}
/**
 * Generate full loan calculation metrics
 */
export function computeLoanMetrics(principal, annualRatePct, tenureMonths) {
    const emi = calculateEMI(principal, annualRatePct, tenureMonths);
    const totalRepayment = new Decimal(emi).times(tenureMonths).toDecimalPlaces(2).toNumber();
    const totalInterest = new Decimal(totalRepayment).minus(principal).toDecimalPlaces(2).toNumber();
    return {
        principal,
        annualInterestRate: annualRatePct,
        tenureMonths,
        monthlyEmi: emi,
        totalInterest: totalInterest > 0 ? totalInterest : 0,
        totalRepayment,
    };
}
/**
 * Generate 3 underwriting scenarios:
 * 1. Conservative (Strict FOIR 40%, interest rate buffer +0.5%)
 * 2. Standard (Policy FOIR 50%, standard rate)
 * 3. Higher Affordability (Max permissible FOIR 60%, extended tenure +12m)
 */
export function generateUnderwritingScenarios(verifiedMonthlyIncome, existingMonthlyObligations, baseInterestRate, requestedTenureMonths, requestedAmount) {
    // 1. Conservative Scenario: 40% FOIR, rate + 0.5%
    const conservativeFoir = 40.0;
    const conservativeRate = baseInterestRate + 0.5;
    const conservativeAffordableEmi = calculateAffordableAdditionalEmi(verifiedMonthlyIncome, existingMonthlyObligations, conservativeFoir);
    const conservativeMaxPrincipal = calculateMaxLoanPrincipal(conservativeAffordableEmi, conservativeRate, requestedTenureMonths);
    // Cap at requested amount or calculated max
    const conservativePrincipal = Math.min(requestedAmount, conservativeMaxPrincipal);
    const conservativeMetrics = computeLoanMetrics(conservativePrincipal, conservativeRate, requestedTenureMonths);
    const conservative = {
        scenarioName: 'Conservative',
        foirPct: conservativeFoir,
        affordableEmi: conservativeAffordableEmi,
        description: 'Conservative underwriting with strict 40% FOIR cap and 50 bps interest buffer for maximum safety.',
        ...conservativeMetrics,
    };
    // 2. Standard Scenario: 50% FOIR, base rate
    const standardFoir = 50.0;
    const standardRate = baseInterestRate;
    const standardAffordableEmi = calculateAffordableAdditionalEmi(verifiedMonthlyIncome, existingMonthlyObligations, standardFoir);
    const standardMaxPrincipal = calculateMaxLoanPrincipal(standardAffordableEmi, standardRate, requestedTenureMonths);
    const standardPrincipal = Math.min(requestedAmount, standardMaxPrincipal);
    const standardMetrics = computeLoanMetrics(standardPrincipal, standardRate, requestedTenureMonths);
    const standard = {
        scenarioName: 'Standard',
        foirPct: standardFoir,
        affordableEmi: standardAffordableEmi,
        description: 'Standard institutional bank underwriting based on policy 50% FOIR guideline.',
        ...standardMetrics,
    };
    // 3. Higher Affordability Scenario: 60% FOIR, rate -0.25%, tenure + 12 months (up to 84 months max)
    const aggressiveFoir = 60.0;
    const aggressiveRate = Math.max(8.0, baseInterestRate - 0.25);
    const aggressiveTenure = Math.min(84, requestedTenureMonths + 12);
    const aggressiveAffordableEmi = calculateAffordableAdditionalEmi(verifiedMonthlyIncome, existingMonthlyObligations, aggressiveFoir);
    const aggressiveMaxPrincipal = calculateMaxLoanPrincipal(aggressiveAffordableEmi, aggressiveRate, aggressiveTenure);
    const aggressivePrincipal = Math.min(requestedAmount * 1.25, aggressiveMaxPrincipal);
    const aggressiveMetrics = computeLoanMetrics(aggressivePrincipal, aggressiveRate, aggressiveTenure);
    const aggressive = {
        scenarioName: 'Higher Affordability',
        foirPct: aggressiveFoir,
        affordableEmi: aggressiveAffordableEmi,
        description: 'Higher affordability scenario considering surplus collateral or co-borrower backing at 60% FOIR ceiling.',
        ...aggressiveMetrics,
    };
    return { conservative, standard, aggressive };
}
