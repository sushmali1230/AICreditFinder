import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { parseStatementCSV, parseStatementExcel, parseStatementText, analyzeBankTransactions, } from '../services/statementParser.js';
import { runCreditAssessment } from '../services/creditEngine.js';
import { generateCreditExplanation } from '../services/aiExplainer.js';
const prisma = new PrismaClient();
// Multer memory storage configuration for secure handling
export const uploadStatementMulter = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
    fileFilter: (_req, file, cb) => {
        const allowedMime = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/pdf',
            'text/plain',
        ];
        if (allowedMime.includes(file.mimetype) ||
            file.originalname.endsWith('.csv') ||
            file.originalname.endsWith('.xlsx') ||
            file.originalname.endsWith('.xls') ||
            file.originalname.endsWith('.pdf') ||
            file.originalname.endsWith('.txt')) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid format: Only CSV, Excel (.xlsx/.xls), and PDF statements supported.'));
        }
    },
});
export async function uploadStatement(req, res) {
    try {
        const customerId = req.params.customerId;
        const { bankName = 'Commercial Bank', accountType = 'SAVINGS' } = req.body;
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        let parsedTransactions = [];
        let fileFormat = 'CSV';
        if (req.file) {
            const filename = req.file.originalname.toLowerCase();
            if (filename.endsWith('.csv')) {
                fileFormat = 'CSV';
                parsedTransactions = await parseStatementCSV(req.file.buffer);
            }
            else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
                fileFormat = 'EXCEL';
                parsedTransactions = parseStatementExcel(req.file.buffer);
            }
            else if (filename.endsWith('.pdf') || filename.endsWith('.txt')) {
                fileFormat = 'PDF';
                // Extract text from buffer
                const textContent = req.file.buffer.toString('utf-8');
                parsedTransactions = parseStatementText(textContent);
            }
        }
        else if (req.body.transactions && Array.isArray(req.body.transactions)) {
            // Structured JSON transactions upload option
            fileFormat = 'CSV';
            parsedTransactions = req.body.transactions.map((t) => ({
                date: new Date(t.date),
                description: t.description,
                amount: Number(t.amount),
                type: t.type,
                category: t.category || 'OTHER',
                balanceAfter: t.balanceAfter ? Number(t.balanceAfter) : undefined,
                isUnusual: Boolean(t.isUnusual),
                isBounced: Boolean(t.isBounced),
                bounceReason: t.bounceReason,
            }));
        }
        else {
            res.status(400).json({ error: 'No statement file or transaction payload provided' });
            return;
        }
        if (parsedTransactions.length === 0) {
            res.status(400).json({
                error: 'Unable to extract valid banking transactions from the uploaded file. Please ensure the statement contains Date, Description, Debit/Credit, and Balance columns.',
            });
            return;
        }
        // Perform banking analysis
        const analysis = analyzeBankTransactions(parsedTransactions, bankName, '•••• •••• ' + Math.floor(1000 + Math.random() * 9000), accountType);
        // Save Bank Statement header
        const statement = await prisma.bankStatement.create({
            data: {
                customerId,
                bankName: analysis.bankName,
                accountNumberMasked: analysis.accountNumberMasked,
                accountType: analysis.accountType,
                statementPeriodStart: analysis.statementPeriodStart,
                statementPeriodEnd: analysis.statementPeriodEnd,
                totalCredits: analysis.totalCredits,
                totalDebits: analysis.totalDebits,
                netCashflow: analysis.netCashflow,
                averageMonthlyBalance: analysis.averageMonthlyBalance,
                minMonthlyBalance: analysis.minMonthlyBalance,
                maxMonthlyBalance: analysis.maxMonthlyBalance,
                monthlySalaryDetected: analysis.monthlySalaryDetected,
                recurringEmiDetected: analysis.recurringEmiDetected,
                bounceCount: analysis.bounceCount,
                unusualTransactionsCount: analysis.unusualTransactionsCount,
                salaryConsistencyScore: analysis.salaryConsistencyScore,
                fileFormat,
            },
        });
        // Save Transactions
        for (const t of parsedTransactions) {
            await prisma.bankTransaction.create({
                data: {
                    bankStatementId: statement.id,
                    date: t.date,
                    description: t.description,
                    referenceNo: t.referenceNo,
                    amount: t.amount,
                    type: t.type,
                    category: t.category,
                    balanceAfter: t.balanceAfter,
                    isUnusual: t.isUnusual,
                    isBounced: t.isBounced,
                    bounceReason: t.bounceReason,
                },
            });
        }
        // Automatically compute / update credit assessment for this customer
        try {
            const activePolicy = await prisma.lendingPolicyConfig.findFirst({
                where: { isDefault: true },
            });
            const itrs = await prisma.itrRecord.findMany({
                where: { customerId },
                orderBy: { financialYear: 'desc' },
            });
            const allStatements = await prisma.bankStatement.findMany({
                where: { customerId },
                include: { transactions: true },
                orderBy: { uploadedAt: 'desc' },
            });
            const policy = activePolicy || undefined;
            const parsedItrs = itrs.map((r) => ({
                assessmentYear: r.assessmentYear,
                financialYear: r.financialYear,
                formType: r.formType,
                grossTotalIncome: r.grossTotalIncome,
                taxableIncome: r.taxableIncome,
                salaryIncome: r.salaryIncome,
                businessProfessionIncome: r.businessProfessionIncome,
                otherIncome: r.otherIncome,
                chapterVIA_Deductions: r.chapterVIA_Deductions,
                totalTaxesPaid: r.totalTaxesPaid,
                refundOrPayable: r.refundOrPayable,
                panNumber: r.panNumber,
                isVerified: r.isVerified,
            }));
            const assessmentResult = runCreditAssessment(customer, analysis, parsedItrs, policy);
            const aiExplanation = generateCreditExplanation(customer.fullName, assessmentResult, customer.requestedLoanAmount, customer.employmentType);
            await prisma.creditAssessment.create({
                data: {
                    customerId,
                    version: 1,
                    status: 'ANALYSIS_COMPLETE',
                    verifiedMonthlyIncome: assessmentResult.verifiedMonthlyIncome,
                    existingDebtObligations: assessmentResult.existingDebtObligations,
                    netDisposableIncome: assessmentResult.netDisposableIncome,
                    dtiRatio: assessmentResult.dtiRatio,
                    foirRatio: assessmentResult.foirRatio,
                    affordableAdditionalEmi: assessmentResult.affordableAdditionalEmi,
                    requestedAmount: assessmentResult.requestedAmount,
                    requestedTenureMonths: assessmentResult.requestedTenureMonths,
                    interestRateAnnual: assessmentResult.interestRateAnnual,
                    calculatedMaxLoanPrincipal: assessmentResult.calculatedMaxLoanPrincipal,
                    calculatedEmi: assessmentResult.calculatedEmi,
                    totalInterestPayable: assessmentResult.totalInterestPayable,
                    totalRepaymentAmount: assessmentResult.totalRepaymentAmount,
                    riskGrade: assessmentResult.riskGrade,
                    positiveIndicators: JSON.stringify(assessmentResult.positiveIndicators),
                    riskFactors: JSON.stringify(assessmentResult.riskFactors),
                    incomeDiscrepancies: JSON.stringify(assessmentResult.incomeDiscrepancies),
                    missingDocuments: JSON.stringify(assessmentResult.missingDocuments),
                    calculationAssumptions: JSON.stringify(assessmentResult.calculationAssumptions),
                    recommendationReasoning: assessmentResult.recommendationReasoning,
                    conservativeScenario: JSON.stringify(assessmentResult.conservativeScenario),
                    standardScenario: JSON.stringify(assessmentResult.standardScenario),
                    aggressiveScenario: JSON.stringify(assessmentResult.aggressiveScenario),
                    aiExplanation,
                },
            });
            await prisma.customer.update({
                where: { id: customerId },
                data: {
                    riskCategory: assessmentResult.riskGrade === 'PRIME_A'
                        ? 'LOW_RISK'
                        : assessmentResult.riskGrade === 'GOOD_B'
                            ? 'MODERATE_RISK'
                            : 'HIGH_RISK',
                },
            });
        }
        catch (assessErr) {
            console.warn('Auto assessment calculation note:', assessErr);
        }
        const statementWithTxns = await prisma.bankStatement.findUnique({
            where: { id: statement.id },
            include: { transactions: { orderBy: { date: 'asc' } } },
        });
        res.status(201).json({
            message: 'Bank statement ingested and analyzed successfully',
            statement: statementWithTxns || statement,
            analysisSummary: {
                ...analysis,
                transactionsCount: parsedTransactions.length,
            },
        });
    }
    catch (error) {
        console.error('Statement upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to process bank statement' });
    }
}
export async function getStatementDetails(req, res) {
    try {
        const id = req.params.id;
        const statement = await prisma.bankStatement.findUnique({
            where: { id },
            include: {
                transactions: {
                    orderBy: { date: 'asc' },
                },
            },
        });
        if (!statement) {
            res.status(404).json({ error: 'Bank statement not found' });
            return;
        }
        res.json({ statement });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve bank statement' });
    }
}
