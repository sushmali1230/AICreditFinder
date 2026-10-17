/**
 * Cross-examine multi-year ITRs against bank statement transactions
 */
export function performCrossVerification(customerPan, customerName, employmentType, itrRecords, statementAnalysis) {
    const discrepancies = [];
    const missingDocuments = [];
    const positiveHighlights = [];
    let penaltyPoints = 0;
    // 1. Check Multi-Year ITR Availability
    const sortedItrs = [...itrRecords].sort((a, b) => {
        // Sort chronologically by Assessment Year / FY
        return a.financialYear.localeCompare(b.financialYear);
    });
    const hasTwoYearsITR = sortedItrs.length >= 2;
    let incomeTrend;
    if (hasTwoYearsITR) {
        const prevItr = sortedItrs[sortedItrs.length - 2];
        const latestItr = sortedItrs[sortedItrs.length - 1];
        const prevIncome = prevItr.grossTotalIncome;
        const latestIncome = latestItr.grossTotalIncome;
        const absChange = latestIncome - prevIncome;
        const growthPct = prevIncome > 0 ? Math.round(((latestIncome - prevIncome) / prevIncome) * 1000) / 10 : 0;
        let classification = 'STABLE';
        let narrative = '';
        if (growthPct >= 15) {
            classification = 'STRONG_GROWTH';
            narrative = `Robust YoY income expansion of +${growthPct}%, rising from ₹${prevIncome.toLocaleString('en-IN')} (${prevItr.financialYear}) to ₹${latestIncome.toLocaleString('en-IN')} (${latestItr.financialYear}).`;
            positiveHighlights.push(narrative);
        }
        else if (growthPct >= 5) {
            classification = 'MODERATE_GROWTH';
            narrative = `Steady income growth of +${growthPct}% YoY across successive tax filings.`;
            positiveHighlights.push(narrative);
        }
        else if (growthPct >= -5) {
            classification = 'STABLE';
            narrative = `Stable financial performance across both filing years with minimal variance (${growthPct}%).`;
        }
        else if (growthPct >= -20) {
            classification = 'DECLINING';
            narrative = `Income contracted by ${Math.abs(growthPct)}% YoY, decreasing from ₹${prevIncome.toLocaleString('en-IN')} to ₹${latestIncome.toLocaleString('en-IN')}.`;
            penaltyPoints += 15;
            discrepancies.push({
                id: 'DISC_ITR_DECLINE',
                severity: 'MEDIUM',
                category: 'ITR_TREND',
                title: 'Year-over-Year Income Decline',
                description: narrative,
                reportedValue: `₹${latestIncome.toLocaleString('en-IN')}`,
                observedValue: `₹${prevIncome.toLocaleString('en-IN')}`,
                variancePercentage: growthPct,
                recommendedAction: 'Obtain underwriter review to understand cause of business slowdown or salary revision.',
            });
        }
        else {
            classification = 'SHARP_CONTRACTION';
            narrative = `Severe income deterioration of ${Math.abs(growthPct)}% YoY between ${prevItr.financialYear} and ${latestItr.financialYear}.`;
            penaltyPoints += 30;
            discrepancies.push({
                id: 'DISC_ITR_SHARP_DROP',
                severity: 'HIGH',
                category: 'ITR_TREND',
                title: 'Substantial Income Deterioration',
                description: narrative,
                reportedValue: `₹${latestIncome.toLocaleString('en-IN')}`,
                observedValue: `₹${prevIncome.toLocaleString('en-IN')}`,
                variancePercentage: growthPct,
                recommendedAction: 'Requires committee sanction; assess current run-rate viability before loan sanction.',
            });
        }
        incomeTrend = {
            previousYearFY: prevItr.financialYear,
            previousYearIncome: prevIncome,
            latestYearFY: latestItr.financialYear,
            latestYearIncome: latestIncome,
            absoluteChange: absChange,
            growthPercentage: growthPct,
            trendClassification: classification,
            narrative,
        };
    }
    else {
        penaltyPoints += 20;
        missingDocuments.push('Prior Financial Year ITR (2nd year mandatory for standard commercial underwriting)');
        discrepancies.push({
            id: 'DISC_MISSING_YEAR_ITR',
            severity: 'HIGH',
            category: 'DOCUMENTATION_GAP',
            title: 'Incomplete Multi-Year ITR History',
            description: 'Only 1 financial year ITR is uploaded. Institutional policy requires consecutive 2-year tax records for reliable income smoothing.',
            recommendedAction: 'Request borrower to upload ITR-V for previous financial year.',
        });
    }
    // 2. Cross-Verification: Annualized Bank Statement Credits vs ITR Gross Total Income
    const latestItr = sortedItrs[sortedItrs.length - 1];
    const latestGti = latestItr ? latestItr.grossTotalIncome : 0;
    // Annualize bank credits based on number of active months observed
    const observedMonths = Math.max(1, statementAnalysis.monthlyBreakdowns.length);
    const annualizedBankCredits = Math.round((statementAnalysis.totalCredits / observedMonths) * 12);
    let varianceGtiVsBankCreditPct = 0;
    if (latestGti > 0 && annualizedBankCredits > 0) {
        varianceGtiVsBankCreditPct = Math.round(((annualizedBankCredits - latestGti) / latestGti) * 100);
        // If Bank Credits are significantly LOWER than ITR declared income (> 25% discrepancy)
        if (annualizedBankCredits < latestGti * 0.75) {
            penaltyPoints += 25;
            discrepancies.push({
                id: 'DISC_INCOME_INFLATION_RISK',
                severity: 'HIGH',
                category: 'INCOME_MISMATCH',
                title: 'Verifiable Banking Inflows Lower Than Declared ITR Income',
                description: `Annualized banking credits (₹${annualizedBankCredits.toLocaleString('en-IN')}) are ${Math.abs(varianceGtiVsBankCreditPct)}% lower than declared ITR income (₹${latestGti.toLocaleString('en-IN')}). Borrower may have unsubmitted alternate bank accounts or inflated tax filings.`,
                reportedValue: `₹${latestGti.toLocaleString('en-IN')} (ITR)`,
                observedValue: `₹${annualizedBankCredits.toLocaleString('en-IN')} (Bank)`,
                variancePercentage: varianceGtiVsBankCreditPct,
                recommendedAction: 'Obtain statements of all secondary bank accounts or apply conservative haircut to eligible income.',
            });
        }
        else if (annualizedBankCredits > latestGti * 1.6) {
            // If Bank credits are substantially HIGHER than ITR (> 60% higher)
            discrepancies.push({
                id: 'DISC_UNREPORTED_TURNOVER',
                severity: 'MEDIUM',
                category: 'INCOME_MISMATCH',
                title: 'Bank Credits Exceed Reported Taxable Income',
                description: `Bank throughput (₹${annualizedBankCredits.toLocaleString('en-IN')}) exceeds reported ITR income by +${varianceGtiVsBankCreditPct}%. Common in business entities due to gross turnover, but warrants GST return verification.`,
                reportedValue: `₹${latestGti.toLocaleString('en-IN')} (ITR)`,
                observedValue: `₹${annualizedBankCredits.toLocaleString('en-IN')} (Bank)`,
                variancePercentage: varianceGtiVsBankCreditPct,
                recommendedAction: 'Cross-check with GSTR-3B filings to verify legitimate commercial sales volume.',
            });
        }
        else {
            positiveHighlights.push(`High correlation between banking transaction throughput (₹${annualizedBankCredits.toLocaleString('en-IN')}/yr) and reported tax filings (₹${latestGti.toLocaleString('en-IN')}).`);
        }
    }
    // 3. Salaried Income Cross-Verification
    if (employmentType === 'SALARIED' && statementAnalysis.monthlySalaryDetected > 0 && latestItr) {
        const annualBankSalary = statementAnalysis.monthlySalaryDetected * 12;
        const itrSalary = latestItr.salaryIncome || latestItr.grossTotalIncome;
        const salaryVariance = Math.round(((annualBankSalary - itrSalary) / itrSalary) * 100);
        if (Math.abs(salaryVariance) <= 15) {
            positiveHighlights.push(`Payroll deposits of ₹${statementAnalysis.monthlySalaryDetected.toLocaleString('en-IN')}/mo align with Form 16 / ITR Section 17 salary records.`);
        }
    }
    // 4. Banking Conduct & Inward Return / Bounce Penalty Detection
    if (statementAnalysis.bounceCount > 0) {
        const severity = statementAnalysis.bounceCount >= 3 ? 'CRITICAL' : 'HIGH';
        penaltyPoints += statementAnalysis.bounceCount * 15;
        discrepancies.push({
            id: 'DISC_BOUNCES_DETECTED',
            severity,
            category: 'BANKING_CONDUCT',
            title: `${statementAnalysis.bounceCount} Inward Cheque / NACH Debit Return(s) Detected`,
            description: `Statement reveals ${statementAnalysis.bounceCount} instances of failed clearing or debit dishonor charges. This indicates cash flow stress or delayed liquidity around repayment dates.`,
            reportedValue: '0 Permitted Under Standard Retail Policy',
            observedValue: `${statementAnalysis.bounceCount} Returns`,
            recommendedAction: 'Investigate dishonor reasons. If NACH bounce is recurring on existing loan, mark loan as high-risk or seek guarantor.',
        });
    }
    else {
        positiveHighlights.push('Flawless banking conduct: 0 inward clearing returns or NACH debit dishonors over the analyzed statement window.');
    }
    // 5. Average Monthly Balance (AMB) Threshold Verification
    if (statementAnalysis.averageMonthlyBalance < 10000) {
        penaltyPoints += 10;
        discrepancies.push({
            id: 'DISC_LOW_AMB',
            severity: 'MEDIUM',
            category: 'BANKING_CONDUCT',
            title: 'Low Average Monthly Balance (AMB)',
            description: `Observed average balance of ₹${statementAnalysis.averageMonthlyBalance.toLocaleString('en-IN')} is below the bank recommended threshold of ₹10,000 for credit appraisal.`,
            reportedValue: '₹10,000 Threshold',
            observedValue: `₹${statementAnalysis.averageMonthlyBalance.toLocaleString('en-IN')}`,
            recommendedAction: 'Evaluate end-of-month balance dips and assess volatility buffer before approving high ticket size.',
        });
    }
    else {
        positiveHighlights.push(`Healthy liquidity buffer: Average bank balance of ₹${statementAnalysis.averageMonthlyBalance.toLocaleString('en-IN')} maintained.`);
    }
    // 6. PAN & Identity Verification
    if (latestItr && latestItr.panNumber && customerPan) {
        const cleanCustomerPan = customerPan.trim().toUpperCase();
        const cleanItrPan = latestItr.panNumber.trim().toUpperCase();
        if (cleanCustomerPan !== cleanItrPan) {
            penaltyPoints += 50;
            discrepancies.push({
                id: 'DISC_PAN_MISMATCH',
                severity: 'CRITICAL',
                category: 'IDENTITY_COMPLIANCE',
                title: 'PAN Identity Mismatch in Tax Return',
                description: `Customer master PAN (${cleanCustomerPan}) does not match the PAN on the uploaded ITR acknowledgment (${cleanItrPan}).`,
                reportedValue: cleanCustomerPan,
                observedValue: cleanItrPan,
                recommendedAction: 'Immediate halt: Underwriter must verify customer identity documentation and re-upload authentic tax forms.',
            });
        }
        else {
            positiveHighlights.push(`PAN verified: Tax records accurately match master profile (${cleanCustomerPan}).`);
        }
    }
    // 7. Statement Span Check
    if (observedMonths < 6) {
        missingDocuments.push(`Additional ${6 - observedMonths} months of Bank Statements (Minimum 6-month continuous audit required)`);
        discrepancies.push({
            id: 'DISC_SHORT_STATEMENT_PERIOD',
            severity: 'LOW',
            category: 'DOCUMENTATION_GAP',
            title: 'Limited Bank Statement History',
            description: `Only ${observedMonths} months of transactions are available. Retail lending policy standard specifies a minimum 6-month transaction lookback.`,
            recommendedAction: 'Collect full 6 months to 12 months statement for accurate seasonal cash-flow smoothing.',
        });
    }
    return {
        hasTwoYearsITR,
        incomeTrend,
        annualBankCreditSum: annualizedBankCredits,
        latestItrGTI: latestGti,
        varianceGtiVsBankCreditPct,
        discrepancies,
        missingDocuments,
        positiveHighlights,
        riskGradePenaltyPoints: penaltyPoints,
    };
}
