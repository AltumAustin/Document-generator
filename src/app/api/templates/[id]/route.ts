import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { templateSchema } from "@/lib/validations"
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

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        versions: { orderBy: { version: "desc" }, take: 10 },
        _count: { select: { questionnaires: true, generatedDocs: true } },
      },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error("Failed to fetch template:", error)
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 })
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

    const template = await prisma.template.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = templateSchema.partial().parse(body)

    const updated = await prisma.template.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "updated",
      resourceType: "template",
      resourceId: updated.id,
      metadata: { changes: data },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update template:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
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

    const template = await prisma.template.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.template.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "deleted",
      resourceType: "template",
      resourceId: params.id,
      metadata: { name: template.name },
    })

    return NextResponse.json({ message: "Template deleted" })
  } catch (error) {
    console.error("Failed to delete template:", error)
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
  }
}
