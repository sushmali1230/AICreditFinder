import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function logAudit(options) {
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
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
}
