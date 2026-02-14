import { prisma } from "@/lib/db"

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "downloaded"
  | "shared"
  | "signed"
  | "generated"
  | "viewed"
  | "exported"
  | "invited"
  | "role_changed"

export type ResourceType =
  | "template"
  | "questionnaire"
  | "response"
  | "document"
  | "signature"
  | "shared_link"
  | "api_key"
  | "webhook"
  | "team_member"
  | "workspace"

export async function createAuditLog(params: {
  workspaceId: string
  userId?: string
  action: AuditAction
  resourceType: ResourceType
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: (params.metadata || {}) as object,
        ipAddress: params.ipAddress,
      },
    })
  } catch (error) {
    console.error("Failed to create audit log:", error)
  }
}
