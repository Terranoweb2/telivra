import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  entityName?: string;
  reason?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        entityName: params.entityName || null,
        reason: params.reason || null,
        details: params.details || null,
        userId: params.userId,
      },
    });
  } catch (err) {
    console.error("[AUDIT] Error logging:", err);
  }
}
