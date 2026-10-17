import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function getAuditLogs(req, res) {
    try {
        const { action, entityType, limit = 100 } = req.query;
        const where = {};
        if (action)
            where.action = String(action);
        if (entityType)
            where.entityType = String(entityType);
        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
        });
        res.json({ logs });
    }
    catch (error) {
        console.error('Audit logs error:', error);
        res.status(500).json({ error: 'Failed to retrieve audit trail logs' });
    }
}
