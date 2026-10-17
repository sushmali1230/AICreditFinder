import { PrismaClient } from '@prisma/client';
import { runCreditAssessment, DEFAULT_LENDING_POLICY } from '../services/creditEngine.js';
import { analyzeBankTransactions } from '../services/statementParser.js';
import { generateCreditExplanation } from '../services/aiExplainer.js';
import { generateCreditAppraisalPDF } from '../services/pdfGenerator.js';
import { logAudit } from '../services/auditService.js';
const prisma = new PrismaClient();
export async function runAssessmentForCustomer(req, res) {
    try {
        const customerId = req.params.customerId;
        const { customInterestRate, customTenureMonths, customRequestedAmount, analystNotes } = req.body;
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                bankStatements: {
                    include: { transactions: true },
                    orderBy: { uploadedAt: 'desc' },
                    take: 1,
                },
                itrRecords: {
                    orderBy: { financialYear: 'desc' },
                },
                creditAssessments: {
                    orderBy: { version: 'desc' },
                    take: 1,
                },
            },
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        // Fetch active policy
        const activePolicyRecord = await prisma.lendingPolicyConfig.findFirst({
            where: { isDefault: true },
        });
        const policy = activePolicyRecord
            ? {
                maxFoirSalaried: activePolicyRecord.maxFoirSalaried,
                maxFoirSelfEmployed: activePolicyRecord.maxFoirSelfEmployed,
                minCreditScore: activePolicyRecord.minCreditScore,
                minAverageMonthlyBalance: activePolicyRecord.minAverageMonthlyBalance,
                baseInterestRate: customInterestRate ? Number(customInterestRate) : activePolicyRecord.baseInterestRate,
                haircutUnverifiedIncome: activePolicyRecord.haircutUnverifiedIncome,
                maxAllowedBouncesLast6Months: activePolicyRecord.maxAllowedBouncesLast6Months,
            }
            : DEFAULT_LENDING_POLICY;
        // Statement analysis
        const latestStmt = customer.bankStatements[0];
        const statementAnalysis = latestStmt
            ? analyzeBankTransactions(latestStmt.transactions, latestStmt.bankName, latestStmt.accountNumberMasked, latestStmt.accountType)
            : analyzeBankTransactions([]);
        // Format ITR records
        const parsedItrs = customer.itrRecords.map((r) => ({
            assessmentYear: r.assessmentYear,
            financialYear: r.financialYear,
            formType: r.formType,
            filingDate: r.filingDate || new Date(),
            filingStatus: r.filingStatus,
            acknowledgmentNumber: r.acknowledgmentNumber,
            grossTotalIncome: r.grossTotalIncome,
            taxableIncome: r.taxableIncome,
            salaryIncome: r.salaryIncome,
            businessProfessionIncome: r.businessProfessionIncome,
            otherIncome: r.otherIncome,
            chapterVIA_Deductions: r.chapterVIA_Deductions,
            totalTaxesPaid: r.totalTaxesPaid,
            refundOrPayable: r.refundOrPayable,
            panNumber: r.panNumber || undefined,
            isVerified: r.isVerified,
        }));
        // Customer parameters (with any temporary overrides)
        const assessmentCustomer = {
            fullName: customer.fullName,
            panNumber: customer.panNumber,
            employmentType: customer.employmentType,
            creditScore: customer.creditScore,
            requestedLoanAmount: customRequestedAmount ? Number(customRequestedAmount) : customer.requestedLoanAmount,
            requestedLoanTenureMonths: customTenureMonths ? Number(customTenureMonths) : customer.requestedLoanTenureMonths,
            requestedLoanPurpose: customer.requestedLoanPurpose,
        };
        // Execute Deterministic Explainable Credit Engine
        const result = runCreditAssessment(assessmentCustomer, statementAnalysis, parsedItrs, policy);
        // Generate Natural Language Plain-Text Explanation
        const aiExplanation = generateCreditExplanation(customer.fullName, result, assessmentCustomer.requestedLoanAmount, customer.employmentType);
        // Versioning
        const latestVersion = customer.creditAssessments[0]?.version || 0;
        const newVersion = latestVersion + 1;
        // Determine initial status based on engine output
        let status = 'ANALYSIS_COMPLETE';
        if (result.recommendedDecision === 'RECOMMEND_APPROVAL' || result.recommendedDecision === 'CONDITIONAL_APPROVAL') {
            status = 'PENDING_APPROVAL';
        }
        else if (result.recommendedDecision === 'RECOMMEND_REJECTION') {
            status = 'REJECTED';
        }
        else {
            status = 'REASSESSMENT_REQUESTED';
        }
        const assessment = await prisma.creditAssessment.create({
            data: {
                customerId,
                version: newVersion,
                status,
                verifiedMonthlyIncome: result.verifiedMonthlyIncome,
                existingDebtObligations: result.existingDebtObligations,
                netDisposableIncome: result.netDisposableIncome,
                dtiRatio: result.dtiRatio,
                foirRatio: result.foirRatio,
                affordableAdditionalEmi: result.affordableAdditionalEmi,
                requestedAmount: assessmentCustomer.requestedLoanAmount,
                requestedTenureMonths: assessmentCustomer.requestedLoanTenureMonths,
                interestRateAnnual: result.interestRateAnnual,
                calculatedMaxLoanPrincipal: result.calculatedMaxLoanPrincipal,
                calculatedEmi: result.calculatedEmi,
                totalInterestPayable: result.totalInterestPayable,
                totalRepaymentAmount: result.totalRepaymentAmount,
                riskGrade: result.riskGrade,
                positiveIndicators: JSON.stringify(result.positiveIndicators),
                riskFactors: JSON.stringify(result.riskFactors),
                incomeDiscrepancies: JSON.stringify(result.incomeDiscrepancies),
                missingDocuments: JSON.stringify(result.missingDocuments),
                calculationAssumptions: JSON.stringify(result.calculationAssumptions),
                recommendationReasoning: result.recommendationReasoning,
                conservativeScenario: JSON.stringify(result.conservativeScenario),
                standardScenario: JSON.stringify(result.standardScenario),
                aggressiveScenario: JSON.stringify(result.aggressiveScenario),
                aiExplanation,
                analystNotes: analystNotes || null,
            },
        });
        // Update customer risk category
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                riskCategory: result.riskGrade === 'PRIME_A'
                    ? 'LOW_RISK'
                    : result.riskGrade === 'GOOD_B'
                        ? 'MODERATE_RISK'
                        : result.riskGrade === 'BORDERLINE_C'
                            ? 'HIGH_RISK'
                            : 'CRITICAL',
            },
        });
        await logAudit({
            userId: req.user?.id,
            userName: req.user?.name,
            userRole: req.user?.role,
            action: 'ASSESSMENT_RUN',
            entityType: 'CreditAssessment',
            entityId: assessment.id,
            details: `Generated Version ${newVersion} assessment for ${customer.fullName}. Grade: ${result.riskGrade}, Max Eligible: ₹${result.calculatedMaxLoanPrincipal.toLocaleString('en-IN')}`,
            ipAddress: req.ip,
        });
        res.status(201).json({
            message: 'Credit assessment executed successfully',
            assessment: {
                ...assessment,
                positiveIndicators: result.positiveIndicators,
                riskFactors: result.riskFactors,
                incomeDiscrepancies: result.incomeDiscrepancies,
                missingDocuments: result.missingDocuments,
                calculationAssumptions: result.calculationAssumptions,
                conservativeScenario: result.conservativeScenario,
                standardScenario: result.standardScenario,
                aggressiveScenario: result.aggressiveScenario,
                crossVerification: result.crossVerification,
            },
        });
    }
    catch (error) {
        console.error('Assessment execution error:', error);
        res.status(500).json({ error: error.message || 'Failed to execute credit assessment' });
    }
}
export async function recordDecision(req, res) {
    try {
        const id = req.params.id;
        const { action, approvedAmount, approvedTenureMonths, approvedInterestRate, approverNotes } = req.body;
        const assessment = await prisma.creditAssessment.findUnique({
            where: { id },
            include: { customer: true },
        });
        if (!assessment) {
            res.status(404).json({ error: 'Credit assessment not found' });
            return;
        }
        let status = assessment.status;
        if (action === 'APPROVE') {
            if (req.user?.role !== 'APPROVER' && req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Only Chief Underwriting Officers or Approvers can sanction credit facilities.' });
                return;
            }
            status = 'APPROVED';
        }
        else if (action === 'REJECT') {
            if (req.user?.role !== 'APPROVER' && req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Only Credit Approvers can issue formal credit rejections.' });
                return;
            }
            status = 'REJECTED';
        }
        else if (action === 'REQUEST_REASSESSMENT') {
            status = 'REASSESSMENT_REQUESTED';
        }
        else {
            res.status(400).json({ error: 'Invalid decision action. Allowed: APPROVE, REJECT, REQUEST_REASSESSMENT' });
            return;
        }
        const updated = await prisma.creditAssessment.update({
            where: { id },
            data: {
                status,
                approverNotes: approverNotes || null,
                decisionBy: req.user?.name,
                decisionDate: new Date(),
                decisionMakerId: req.user?.id,
                approvedAmount: action === 'APPROVE' ? (approvedAmount ? Number(approvedAmount) : assessment.calculatedMaxLoanPrincipal) : null,
                approvedTenureMonths: action === 'APPROVE' ? (approvedTenureMonths ? Number(approvedTenureMonths) : assessment.requestedTenureMonths) : null,
                approvedInterestRate: action === 'APPROVE' ? (approvedInterestRate ? Number(approvedInterestRate) : assessment.interestRateAnnual) : null,
            },
        });
        const customerName = assessment.customer?.fullName || 'Customer';
        await logAudit({
            userId: req.user?.id,
            userName: req.user?.name,
            userRole: req.user?.role,
            action: `LOAN_${action}`,
            entityType: 'CreditAssessment',
            entityId: assessment.id,
            details: `${req.user?.name} (${req.user?.role}) recorded decision: ${status} for ${customerName}. Notes: ${approverNotes || 'None'}`,
            ipAddress: req.ip,
        });
        res.json({
            message: `Decision recorded successfully: ${status}`,
            assessment: updated,
        });
    }
    catch (error) {
        console.error('Decision recording error:', error);
        res.status(500).json({ error: 'Failed to record underwriting decision' });
    }
}
export async function downloadCAMReport(req, res) {
    try {
        const id = req.params.id;
        const assessment = await prisma.creditAssessment.findUnique({
            where: { id },
            include: {
                customer: {
                    include: {
                        bankStatements: {
                            include: { transactions: true },
                            orderBy: { uploadedAt: 'desc' },
                            take: 1,
                        },
                        itrRecords: {
                            orderBy: { financialYear: 'desc' },
                        },
                    },
                },
            },
        });
        if (!assessment) {
            res.status(404).json({ error: 'Assessment not found' });
            return;
        }
        const customer = assessment.customer;
        if (!customer) {
            res.status(404).json({ error: 'Associated customer record not found' });
            return;
        }
        const latestStmt = customer.bankStatements[0];
        const statementAnalysis = latestStmt
            ? analyzeBankTransactions(latestStmt.transactions, latestStmt.bankName, latestStmt.accountNumberMasked, latestStmt.accountType)
            : null;
        const parsedItrs = customer.itrRecords.map((r) => ({
            assessmentYear: r.assessmentYear,
            financialYear: r.financialYear,
            formType: r.formType,
            filingDate: r.filingDate || new Date(),
            filingStatus: r.filingStatus,
            acknowledgmentNumber: r.acknowledgmentNumber,
            grossTotalIncome: r.grossTotalIncome,
            taxableIncome: r.taxableIncome,
            salaryIncome: r.salaryIncome,
            businessProfessionIncome: r.businessProfessionIncome,
            otherIncome: r.otherIncome,
            chapterVIA_Deductions: r.chapterVIA_Deductions,
            totalTaxesPaid: r.totalTaxesPaid,
            refundOrPayable: r.refundOrPayable,
            isVerified: r.isVerified,
        }));
        // Parse JSON fields
        const positiveIndicators = JSON.parse(assessment.positiveIndicators || '[]');
        const riskFactors = JSON.parse(assessment.riskFactors || '[]');
        const incomeDiscrepancies = JSON.parse(assessment.incomeDiscrepancies || '[]');
        const missingDocuments = JSON.parse(assessment.missingDocuments || '[]');
        const calculationAssumptions = JSON.parse(assessment.calculationAssumptions || '[]');
        const conservativeScenario = JSON.parse(assessment.conservativeScenario || '{}');
        const standardScenario = JSON.parse(assessment.standardScenario || '{}');
        const aggressiveScenario = JSON.parse(assessment.aggressiveScenario || '{}');
        const pdfBuffer = await generateCreditAppraisalPDF({
            assessmentId: assessment.id,
            customer: {
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone,
                panNumber: customer.panNumber,
                employmentType: customer.employmentType,
                employerName: customer.employerName,
                businessName: customer.businessName,
                city: customer.city,
                state: customer.state,
                creditScore: customer.creditScore,
                requestedLoanAmount: assessment.requestedAmount,
                requestedLoanTenureMonths: assessment.requestedTenureMonths,
                requestedLoanPurpose: customer.requestedLoanPurpose,
            },
            assessment: {
                verifiedMonthlyIncome: assessment.verifiedMonthlyIncome,
                existingDebtObligations: assessment.existingDebtObligations,
                netDisposableIncome: assessment.netDisposableIncome,
                dtiRatio: assessment.dtiRatio,
                foirRatio: assessment.foirRatio,
                affordableAdditionalEmi: assessment.affordableAdditionalEmi,
                requestedAmount: assessment.requestedAmount,
                requestedTenureMonths: assessment.requestedTenureMonths,
                interestRateAnnual: assessment.interestRateAnnual,
                calculatedMaxLoanPrincipal: assessment.calculatedMaxLoanPrincipal,
                calculatedEmi: assessment.calculatedEmi,
                totalInterestPayable: assessment.totalInterestPayable,
                totalRepaymentAmount: assessment.totalRepaymentAmount,
                riskGrade: assessment.riskGrade,
                riskScore: Math.round(assessment.calculatedMaxLoanPrincipal / 100000),
                positiveIndicators,
                riskFactors,
                incomeDiscrepancies,
                missingDocuments,
                calculationAssumptions,
                recommendationReasoning: assessment.recommendationReasoning,
                conservativeScenario,
                standardScenario,
                aggressiveScenario,
                crossVerification: {},
                recommendedDecision: 'RECOMMEND_APPROVAL',
            },
            statementAnalysis,
            itrRecords: parsedItrs,
            status: assessment.status,
            decisionBy: assessment.decisionBy,
            decisionDate: assessment.decisionDate,
            approvedAmount: assessment.approvedAmount,
            approverNotes: assessment.approverNotes,
            analystNotes: assessment.analystNotes,
        });
        const safeName = customer.fullName.replace(/[^a-zA-Z0-9]/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="CAM_${safeName}_${assessment.id.slice(0, 6)}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate Credit Appraisal Memorandum PDF' });
    }
}
