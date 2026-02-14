import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
      include: {
        _count: {
          select: {
            users: true,
            templates: true,
            questionnaires: true,
            apiKeys: true,
            webhookEndpoints: true,
          },
        },
      },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(workspace)
  } catch (error) {
    console.error("Failed to fetch workspace:", error)
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    // Only OWNER and ADMIN can update workspace
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()

    const allowedFields = ["name", "logo", "brandColor"]
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const workspace = await prisma.workspace.update({
      where: { id: user.workspaceId },
      data: updateData,
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "updated",
      resourceType: "workspace",
      resourceId: workspace.id,
      metadata: { changes: updateData },
    })

    return NextResponse.json(workspace)
  } catch (error) {
    console.error("Failed to update workspace:", error)
    return NextResponse.json(
      { error: "Failed to update workspace" },
      { status: 500 }
    )
  }
}
