/**
 * Deterministic AI Explanation Engine
 * Provides clear, professional, plain-language summary of credit assessment
 * without inventing financial numbers or hallucinating facts.
 */
export function generateCreditExplanation(customerName, assessment, requestedAmount, employmentType) {
    const verifiedMonthly = assessment.verifiedMonthlyIncome.toLocaleString('en-IN');
    const existingDebt = assessment.existingDebtObligations.toLocaleString('en-IN');
    const foir = assessment.foirRatio;
    const maxPrincipal = assessment.calculatedMaxLoanPrincipal.toLocaleString('en-IN');
    const suggestedEmi = assessment.calculatedEmi.toLocaleString('en-IN');
    const rate = assessment.interestRateAnnual;
    let gradeDescription = '';
    switch (assessment.riskGrade) {
        case 'PRIME_A':
            gradeDescription = 'Prime Grade A (Lowest Credit Risk Profile)';
            break;
        case 'GOOD_B':
            gradeDescription = 'Good Grade B (Standard Prudent Risk Profile)';
            break;
        case 'BORDERLINE_C':
            gradeDescription = 'Borderline Grade C (Moderate Risk - Requires Conditional Covenants)';
            break;
        case 'HIGH_RISK_D':
            gradeDescription = 'High Risk Grade D (Elevated Leverage / Past Payment Dishonor)';
            break;
    }
    let statusSummary = '';
    if (assessment.recommendedDecision === 'RECOMMEND_APPROVAL') {
        statusSummary = `The credit appraisal engine recommends sanctioning the requested credit facility. The applicant demonstrates stable cash flow sufficiency with a post-disbursement debt servicing ratio well within bank policy benchmarks.`;
    }
    else if (assessment.recommendedDecision === 'CONDITIONAL_APPROVAL') {
        statusSummary = `The assessment recommends conditional approval with stipulations. While cash flow indicates repayment capacity up to ₹${suggestedEmi}/month, certain risk flags require additional documentation or collateral enhancement prior to disbursement.`;
    }
    else if (assessment.recommendedDecision === 'MANUAL_COMMITTEE_REVIEW') {
        statusSummary = `The application requires escalation to the Branch Credit Committee for manual review due to elevated existing obligations or banking conduct anomalies.`;
    }
    else {
        statusSummary = `Sanction is not recommended under current financial parameters. The applicant is currently overleveraged, with existing commitments exceeding maximum permissible debt servicing guidelines.`;
    }
    const sections = [
        `### Executive Credit Summary for ${customerName}`,
        `**Overall Risk Assessment**: ${gradeDescription}`,
        `**Recommendation Status**: ${assessment.recommendedDecision.replace(/_/g, ' ')}`,
        '',
        `#### 1. Underwriting Decision Summary`,
        statusSummary,
        '',
        `#### 2. Key Financial Ratios`,
        `- **Verified Net Monthly Income**: ₹${verifiedMonthly}`,
        `- **Existing Monthly Debt Obligations**: ₹${existingDebt}`,
        `- **Baseline FOIR (Fixed Obligation to Income Ratio)**: ${foir}%`,
        `- **Affordable Additional EMI**: ₹${assessment.affordableAdditionalEmi.toLocaleString('en-IN')} / month`,
        `- **Recommended Loan Sanction**: Up to ₹${maxPrincipal} at ${rate}% p.a. for ${assessment.requestedTenureMonths} months (Estimated EMI: ₹${suggestedEmi})`,
        '',
        `#### 3. Positive Financial Drivers`,
        assessment.positiveIndicators.map((ind) => `• ${ind}`).join('\n') || '• No prime indicators identified.',
        '',
        `#### 4. Risk Factors & Vulnerabilities`,
        assessment.riskFactors.map((rf) => `• ${rf}`).join('\n') || '• No adverse credit risk flags detected.',
        '',
        `#### 5. Lending Scenarios Summary`,
        `- **Conservative Scenario**: Loan ₹${assessment.conservativeScenario.principal.toLocaleString('en-IN')} at ${assessment.conservativeScenario.annualInterestRate}% (EMI: ₹${assessment.conservativeScenario.monthlyEmi.toLocaleString('en-IN')}) with strict 40% FOIR cap.`,
        `- **Standard Scenario**: Loan ₹${assessment.standardScenario.principal.toLocaleString('en-IN')} at ${assessment.standardScenario.annualInterestRate}% (EMI: ₹${assessment.standardScenario.monthlyEmi.toLocaleString('en-IN')}) at policy 50% FOIR limit.`,
        `- **Higher Affordability Scenario**: Loan ₹${assessment.aggressiveScenario.principal.toLocaleString('en-IN')} at ${assessment.aggressiveScenario.annualInterestRate}% (EMI: ₹${assessment.aggressiveScenario.monthlyEmi.toLocaleString('en-IN')}) with extended tenure and collateral support.`,
        '',
        `> **Note**: Final credit sanction requires formal review and sign-off by an authorized bank approving officer. Financial values are deterministically calculated based on uploaded documentation.`,
    ];
    return sections.join('\n');
}
