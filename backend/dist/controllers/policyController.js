import { PrismaClient } from '@prisma/client';
import { logAudit } from '../services/auditService.js';
const prisma = new PrismaClient();
export async function getLendingPolicies(_req, res) {
    try {
        const policies = await prisma.lendingPolicyConfig.findMany({
            orderBy: { isDefault: 'desc' },
        });
        res.json({ policies });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve lending policies' });
    }
}
export async function updatePolicy(req, res) {
    try {
        const id = req.params.id;
        const { maxFoirSalaried, maxFoirSelfEmployed, minCreditScore, minAverageMonthlyBalance, baseInterestRate, haircutUnverifiedIncome, maxAllowedBouncesLast6Months, } = req.body;
        const policy = await prisma.lendingPolicyConfig.update({
            where: { id },
            data: {
                maxFoirSalaried: maxFoirSalaried !== undefined ? Number(maxFoirSalaried) : undefined,
                maxFoirSelfEmployed: maxFoirSelfEmployed !== undefined ? Number(maxFoirSelfEmployed) : undefined,
                minCreditScore: minCreditScore !== undefined ? Number(minCreditScore) : undefined,
                minAverageMonthlyBalance: minAverageMonthlyBalance !== undefined ? Number(minAverageMonthlyBalance) : undefined,
                baseInterestRate: baseInterestRate !== undefined ? Number(baseInterestRate) : undefined,
                haircutUnverifiedIncome: haircutUnverifiedIncome !== undefined ? Number(haircutUnverifiedIncome) : undefined,
                maxAllowedBouncesLast6Months: maxAllowedBouncesLast6Months !== undefined ? Number(maxAllowedBouncesLast6Months) : undefined,
            },
        });
        await logAudit({
            userId: req.user?.id,
            userName: req.user?.name,
            userRole: req.user?.role,
            action: 'POLICY_UPDATED',
            entityType: 'LendingPolicy',
            entityId: policy.id,
            details: `Updated policy parameters: Salaried FOIR ${policy.maxFoirSalaried}%, Base Rate ${policy.baseInterestRate}%`,
            ipAddress: req.ip,
        });
        res.json({
            message: 'Lending policy updated successfully',
            policy,
        });
    }
    catch (error) {
        console.error('Policy update error:', error);
        res.status(500).json({ error: 'Failed to update lending policy' });
    }
}
