import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { action, entityType, limit = 100 } = req.query;

    const where: any = {};
    if (action) where.action = String(action);
    if (entityType) where.entityType = String(entityType);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    res.json({ logs });
  } catch (error: any) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve audit trail logs' });
  }
}
