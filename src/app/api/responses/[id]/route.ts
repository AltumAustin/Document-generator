import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { createAuditLog } from "@/lib/audit"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const response = await prisma.response.findUnique({
      where: { id: params.id },
      include: {
        questionnaire: {
          include: {
            fields: { orderBy: { order: "asc" } },
            template: { select: { id: true, name: true } },
          },
        },
        generatedDocs: {
          include: {
            template: { select: { id: true, name: true } },
            signatureRequests: true,
          },
          orderBy: { generatedAt: "desc" },
        },
      },
    })

    if (!response) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      )
    }

    if (response.questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Failed to fetch response:", error)
    return NextResponse.json(
      { error: "Failed to fetch response" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const existing = await prisma.response.findUnique({
      where: { id: params.id },
      include: {
        questionnaire: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      )
    }

    if (existing.questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()

    const updateData: Record<string, unknown> = {}

    if (body.answers !== undefined) {
      updateData.answers = body.answers as object
    }

    if (body.status !== undefined) {
      if (!["IN_PROGRESS", "COMPLETED", "ARCHIVED"].includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be IN_PROGRESS, COMPLETED, or ARCHIVED." },
          { status: 400 }
        )
      }
      updateData.status = body.status
      if (body.status === "COMPLETED" && !existing.completedAt) {
        updateData.completedAt = new Date()
      }
    }

    if (body.respondentEmail !== undefined) {
      updateData.respondentEmail = body.respondentEmail
    }

    if (body.respondentName !== undefined) {
      updateData.respondentName = body.respondentName
    }

    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata as object
    }

    const updated = await prisma.response.update({
      where: { id: params.id },
      data: updateData,
      include: {
        questionnaire: { select: { id: true, title: true } },
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "updated",
      resourceType: "response",
      resourceId: updated.id,
      metadata: { status: updated.status },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update response:", error)
    return NextResponse.json(
      { error: "Failed to update response" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const existing = await prisma.response.findUnique({
      where: { id: params.id },
      include: {
        questionnaire: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      )
    }

    if (existing.questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.response.delete({
      where: { id: params.id },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "deleted",
      resourceType: "response",
      resourceId: params.id,
    })

    return NextResponse.json({ message: "Response deleted" })
  } catch (error) {
    console.error("Failed to delete response:", error)
    return NextResponse.json(
      { error: "Failed to delete response" },
      { status: 500 }
    )
  }
}
