import { calculateMaxLoanPrincipal, calculateFOIR, calculateDTI, calculateAffordableAdditionalEmi, computeLoanMetrics, generateUnderwritingScenarios, } from '../utils/financialMath.js';
import { performCrossVerification } from './discrepancyDetector.js';
export const DEFAULT_LENDING_POLICY = {
    maxFoirSalaried: 50.0,
    maxFoirSelfEmployed: 55.0,
    minCreditScore: 650,
    minAverageMonthlyBalance: 10000,
    baseInterestRate: 10.5,
    haircutUnverifiedIncome: 20.0,
    maxAllowedBouncesLast6Months: 1,
};
/**
 * Deterministic Explainable Credit Assessment Engine
 */
export function runCreditAssessment(customer, statementAnalysis, itrRecords, policy = DEFAULT_LENDING_POLICY) {
    // Step 1: Cross-Verification & Red Flag Analysis
    const crossVerification = performCrossVerification(customer.panNumber, customer.fullName, customer.employmentType, itrRecords, statementAnalysis);
    // Step 2: Deterministic Verified Monthly Income Determination
    let verifiedMonthlyIncome = 0;
    const calculationAssumptions = [];
    const sortedItrs = [...itrRecords].sort((a, b) => a.financialYear.localeCompare(b.financialYear));
    const latestItr = sortedItrs[sortedItrs.length - 1];
    const prevItr = sortedItrs.length >= 2 ? sortedItrs[sortedItrs.length - 2] : null;
    if (customer.employmentType === 'SALARIED') {
        const bankSalary = statementAnalysis.monthlySalaryDetected;
        const itrMonthlySalary = latestItr ? Math.round((latestItr.salaryIncome || latestItr.grossTotalIncome) / 12) : 0;
        if (bankSalary > 0 && itrMonthlySalary > 0) {
            // Both exist: check variance
            const variancePct = Math.abs((bankSalary - itrMonthlySalary) / itrMonthlySalary) * 100;
            if (variancePct <= 15) {
                // High correlation: take bank salary as verified net take-home
                verifiedMonthlyIncome = bankSalary;
                calculationAssumptions.push(`Verified Monthly Income set to ₹${verifiedMonthlyIncome.toLocaleString('en-IN')} based on recurring payroll deposits matching Form 16 / ITR Section 17 records.`);
            }
            else if (bankSalary < itrMonthlySalary) {
                // Prudent banking: If actual bank salary is lower than ITR, cap at observed bank salary
                verifiedMonthlyIncome = bankSalary;
                calculationAssumptions.push(`Prudent underwriting cap: Verified income restricted to observed bank salary (₹${bankSalary.toLocaleString('en-IN')}) as it is lower than declared ITR salary (₹${itrMonthlySalary.toLocaleString('en-IN')}).`);
            }
            else {
                // Bank salary higher than ITR: conservative blended average
                verifiedMonthlyIncome = Math.round(bankSalary * 0.7 + itrMonthlySalary * 0.3);
                calculationAssumptions.push(`Blended average applied: Bank payroll deposits (₹${bankSalary.toLocaleString('en-IN')}) and ITR salary (₹${itrMonthlySalary.toLocaleString('en-IN')}) reconciled at ₹${verifiedMonthlyIncome.toLocaleString('en-IN')}.`);
            }
        }
        else if (bankSalary > 0) {
            verifiedMonthlyIncome = Math.round(bankSalary * (1 - policy.haircutUnverifiedIncome / 100));
            calculationAssumptions.push(`Haircut of ${policy.haircutUnverifiedIncome}% applied to bank salary (₹${bankSalary.toLocaleString('en-IN')}) due to lack of corresponding ITR salary certification.`);
        }
        else if (itrMonthlySalary > 0) {
            verifiedMonthlyIncome = Math.round(itrMonthlySalary * 0.85); // 15% estimated PF / tax withholding deduction
            calculationAssumptions.push(`Estimated take-home income of ₹${verifiedMonthlyIncome.toLocaleString('en-IN')} derived from annual ITR taxable income less estimated payroll withholdings.`);
        }
        else {
            verifiedMonthlyIncome = 30000;
            calculationAssumptions.push('Default baseline income assumed due to unverified salary deposits; requires manual salary slip upload.');
        }
    }
    else {
        // SELF EMPLOYED (Business / Professional)
        let avgAnnualBusinessProfit = 0;
        if (latestItr && prevItr) {
            avgAnnualBusinessProfit = Math.round((latestItr.grossTotalIncome + prevItr.grossTotalIncome) / 2);
            calculationAssumptions.push(`2-Year ITR income smoothing applied: Average annual declared taxable profit of ₹${avgAnnualBusinessProfit.toLocaleString('en-IN')} across ${prevItr.financialYear} and ${latestItr.financialYear}.`);
        }
        else if (latestItr) {
            avgAnnualBusinessProfit = latestItr.grossTotalIncome;
            calculationAssumptions.push(`Single year ITR GTI (₹${latestItr.grossTotalIncome.toLocaleString('en-IN')}) utilized; subjected to standard self-employed volatility haircut.`);
        }
        const monthlyBusinessDraw = avgAnnualBusinessProfit > 0 ? Math.round(avgAnnualBusinessProfit / 12) : 0;
        const bankAverageMonthlyCredit = Math.round(statementAnalysis.totalCredits / Math.max(1, statementAnalysis.monthlyBreakdowns.length));
        if (monthlyBusinessDraw > 0) {
            // Haircut if bank statement throughput does not convincingly corroborate business turnover
            const requiredTurnover = monthlyBusinessDraw * 2.5; // Commercial rule of thumb: turnover should be at least 2.5x net profit
            if (bankAverageMonthlyCredit < requiredTurnover) {
                verifiedMonthlyIncome = Math.round(monthlyBusinessDraw * 0.8);
                calculationAssumptions.push(`20% conservative margin haircut applied: Observed monthly bank credits (₹${bankAverageMonthlyCredit.toLocaleString('en-IN')}) lower than benchmark business throughput.`);
            }
            else {
                verifiedMonthlyIncome = monthlyBusinessDraw;
            }
        }
        else {
            verifiedMonthlyIncome = Math.round(bankAverageMonthlyCredit * 0.25); // Estimated 25% net operating margin
            calculationAssumptions.push(`Net business draw estimated at 25% of verified monthly bank credits (₹${bankAverageMonthlyCredit.toLocaleString('en-IN')}).`);
        }
    }
    // Step 3: Existing Debt Obligations
    const existingDebtObligations = statementAnalysis.recurringEmiDetected;
    // Step 4: Fixed Obligation to Income Ratio (FOIR) & DTI
    const foirRatio = calculateFOIR(existingDebtObligations, verifiedMonthlyIncome);
    const annualDebtPayments = existingDebtObligations * 12;
    const annualVerifiedIncome = verifiedMonthlyIncome * 12;
    const dtiRatio = calculateDTI(annualDebtPayments, annualVerifiedIncome);
    // Step 5: Estimated Net Disposable Income
    // Living expenses benchmark: 25% of income or min ₹15,000
    const estimatedLivingExpenses = Math.max(15000, Math.round(verifiedMonthlyIncome * 0.25));
    const netDisposableIncome = Math.max(0, verifiedMonthlyIncome - existingDebtObligations - estimatedLivingExpenses);
    // Step 6: Policy FOIR Limit and Affordable Additional EMI
    const policyMaxFoir = customer.employmentType === 'SALARIED' ? policy.maxFoirSalaried : policy.maxFoirSelfEmployed;
    const affordableAdditionalEmi = calculateAffordableAdditionalEmi(verifiedMonthlyIncome, existingDebtObligations, policyMaxFoir);
    // Step 7: Risk Grade Scoring & Underwriting Matrix
    let baseScore = customer.creditScore; // e.g. 750
    // Apply penalty points from banking red flags and discrepancy detector
    const netAdjustedScore = Math.max(300, Math.min(900, baseScore - crossVerification.riskGradePenaltyPoints));
    let riskGrade = 'GOOD_B';
    let interestRateAnnual = policy.baseInterestRate;
    let recommendedDecision = 'RECOMMEND_APPROVAL';
    if (netAdjustedScore >= 750 && foirRatio <= 42 && statementAnalysis.bounceCount === 0 && crossVerification.hasTwoYearsITR) {
        riskGrade = 'PRIME_A';
        interestRateAnnual = Math.max(8.5, policy.baseInterestRate - 0.5); // Prime discount
        recommendedDecision = 'RECOMMEND_APPROVAL';
    }
    else if (netAdjustedScore >= 690 && foirRatio <= 52 && statementAnalysis.bounceCount <= policy.maxAllowedBouncesLast6Months) {
        riskGrade = 'GOOD_B';
        interestRateAnnual = policy.baseInterestRate;
        recommendedDecision = 'RECOMMEND_APPROVAL';
    }
    else if (netAdjustedScore >= 630 && foirRatio <= 60 && statementAnalysis.bounceCount <= 2) {
        riskGrade = 'BORDERLINE_C';
        interestRateAnnual = policy.baseInterestRate + 1.0; // Risk premium
        recommendedDecision = 'CONDITIONAL_APPROVAL';
    }
    else {
        riskGrade = 'HIGH_RISK_D';
        interestRateAnnual = policy.baseInterestRate + 2.5;
        recommendedDecision = foirRatio > 65 || statementAnalysis.bounceCount >= 3 ? 'RECOMMEND_REJECTION' : 'MANUAL_COMMITTEE_REVIEW';
    }
    calculationAssumptions.push(`Base benchmark lending rate: ${policy.baseInterestRate}%. Underwriter assigned rate: ${interestRateAnnual}% based on risk grade ${riskGrade} and adjusted credit score ${netAdjustedScore}.`);
    calculationAssumptions.push(`Maximum permissible institutional FOIR ceiling: ${policyMaxFoir}%. Current applicant baseline FOIR: ${foirRatio}%.`);
    // Step 8: Calculate Max Loan Principal, EMI, and Repayment
    const calculatedMaxLoanPrincipal = calculateMaxLoanPrincipal(affordableAdditionalEmi, interestRateAnnual, customer.requestedLoanTenureMonths);
    // Proposed loan ticket: Min of requested amount and calculated capacity
    const proposedPrincipal = Math.min(customer.requestedLoanAmount, calculatedMaxLoanPrincipal);
    const loanMetrics = computeLoanMetrics(proposedPrincipal > 0 ? proposedPrincipal : customer.requestedLoanAmount, interestRateAnnual, customer.requestedLoanTenureMonths);
    // Step 9: Multi-Scenario Analysis (Conservative, Standard, Higher Affordability)
    const scenarios = generateUnderwritingScenarios(verifiedMonthlyIncome, existingDebtObligations, policy.baseInterestRate, customer.requestedLoanTenureMonths, customer.requestedLoanAmount);
    // Step 10: Compile Indicators, Risk Factors, and Explainability Narrative
    const positiveIndicators = [...crossVerification.positiveHighlights];
    const riskFactors = [];
    if (customer.creditScore >= 750) {
        positiveIndicators.push(`Excellent bureau track record: Prime bureau score of ${customer.creditScore} denotes disciplined debt servicing.`);
    }
    else if (customer.creditScore < 650) {
        riskFactors.push(`Sub-prime credit score of ${customer.creditScore} represents elevated historical default vulnerability.`);
    }
    if (foirRatio <= 30) {
        positiveIndicators.push(`Low existing debt leverage: FOIR of ${foirRatio}% leaves substantial headroom for new credit lines.`);
    }
    else if (foirRatio > 50) {
        riskFactors.push(`Elevated debt servicing burden: Existing EMIs already consume ${foirRatio}% of verified monthly income.`);
    }
    if (statementAnalysis.salaryConsistencyScore >= 90) {
        positiveIndicators.push(`High income stability: Income consistency index of ${statementAnalysis.salaryConsistencyScore}% over statement window.`);
    }
    else if (statementAnalysis.salaryConsistencyScore < 70) {
        riskFactors.push(`Income volatility detected: Fluctuating monthly banking inflows (Stability index: ${statementAnalysis.salaryConsistencyScore}%).`);
    }
    if (statementAnalysis.bounceCount > 0) {
        riskFactors.push(`Payment dishonor events: ${statementAnalysis.bounceCount} inward return penalty charges recorded.`);
    }
    if (crossVerification.discrepancies.length > 0) {
        for (const d of crossVerification.discrepancies) {
            if (d.severity === 'HIGH' || d.severity === 'CRITICAL') {
                riskFactors.push(`${d.title}: ${d.description}`);
            }
        }
    }
    // Composite Underwriting Score (0-100)
    const scoreBase = Math.round((netAdjustedScore / 900) * 50); // up to 50 pts
    const foirPts = Math.round(Math.max(0, (65 - foirRatio) / 65) * 25); // up to 25 pts
    const stabilityPts = Math.round((statementAnalysis.salaryConsistencyScore / 100) * 15); // up to 15 pts
    const conductPts = statementAnalysis.bounceCount === 0 ? 10 : Math.max(0, 10 - statementAnalysis.bounceCount * 4); // up to 10 pts
    const riskScore = Math.min(100, Math.max(10, scoreBase + foirPts + stabilityPts + conductPts));
    // Synthesize Detailed Explainability Reasoning
    let reasoning = '';
    if (recommendedDecision === 'RECOMMEND_APPROVAL') {
        reasoning = `Based on institutional retail underwriting guidelines, applicant qualifies for loan sanction up to ₹${proposedPrincipal.toLocaleString('en-IN')} with an estimated monthly installment of ₹${loanMetrics.monthlyEmi.toLocaleString('en-IN')}. Verified monthly cash flow of ₹${verifiedMonthlyIncome.toLocaleString('en-IN')} adequately supports the proposed EMI while maintaining a post-disbursement FOIR of ${calculateFOIR(existingDebtObligations + loanMetrics.monthlyEmi, verifiedMonthlyIncome)}% (comfortably below the ${policyMaxFoir}% policy limit).`;
    }
    else if (recommendedDecision === 'CONDITIONAL_APPROVAL') {
        reasoning = `Conditional approval recommended with stipulations. While verified income of ₹${verifiedMonthlyIncome.toLocaleString('en-IN')} supports an EMI of up to ₹${affordableAdditionalEmi.toLocaleString('en-IN')}, the borderline credit profile (Risk Grade ${riskGrade}) requires additional security, salary mandate confirmation, or reduced sanction ticket size of ₹${calculatedMaxLoanPrincipal.toLocaleString('en-IN')}.`;
    }
    else if (recommendedDecision === 'MANUAL_COMMITTEE_REVIEW') {
        reasoning = `Application routed for manual Credit Committee evaluation. Existing debt obligations (₹${existingDebtObligations.toLocaleString('en-IN')}/mo) or identified banking discrepancies require branch manager review before sanction can proceed.`;
    }
    else {
        reasoning = `Sanction not recommended in current structure. The applicant's existing fixed obligations already consume ${foirRatio}% of verified income, exceeding the prudent underwriting limit of ${policyMaxFoir}%. Additionally, recorded banking returns or credit risk metrics present heightened default probability.`;
    }
    return {
        verifiedMonthlyIncome,
        existingDebtObligations,
        netDisposableIncome,
        dtiRatio,
        foirRatio,
        affordableAdditionalEmi,
        requestedAmount: customer.requestedLoanAmount,
        requestedTenureMonths: customer.requestedLoanTenureMonths,
        interestRateAnnual,
        calculatedMaxLoanPrincipal,
        calculatedEmi: loanMetrics.monthlyEmi,
        totalInterestPayable: loanMetrics.totalInterest,
        totalRepaymentAmount: loanMetrics.totalRepayment,
        riskGrade,
        riskScore,
        positiveIndicators,
        riskFactors,
        incomeDiscrepancies: crossVerification.discrepancies,
        missingDocuments: crossVerification.missingDocuments,
        calculationAssumptions,
        recommendationReasoning: reasoning,
        conservativeScenario: scenarios.conservative,
        standardScenario: scenarios.standard,
        aggressiveScenario: scenarios.aggressive,
        crossVerification,
        recommendedDecision,
    };
}
