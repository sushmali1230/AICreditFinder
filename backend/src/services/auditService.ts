import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogAuditOptions {
  userId?: string | null;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: 'Customer' | 'CreditAssessment' | 'BankStatement' | 'ItrRecord' | 'LendingPolicy' | 'Auth';
  entityId: string;
  details: string | Record<string, any>;
  ipAddress?: string;
}

export async function logAudit(options: LogAuditOptions): Promise<void> {
  try {
    const detailsStr = typeof options.details === 'string' ? options.details : JSON.stringify(options.details);

    await prisma.auditLog.create({
      data: {
        userId: options.userId || null,
        userName: options.userName || 'System / Service',
        userRole: options.userRole || 'SYSTEM',
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        details: detailsStr,
        ipAddress: options.ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
