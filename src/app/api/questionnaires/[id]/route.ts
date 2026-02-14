import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { questionnaireSchema } from "@/lib/validations"
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

    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: params.id },
      include: {
        fields: { orderBy: { order: "asc" } },
        conditionalLogic: true,
        sharedLinks: { where: { isActive: true } },
        template: { select: { id: true, name: true, variables: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { responses: true } },
      },
    })

    if (!questionnaire) {
      return NextResponse.json(
        { error: "Questionnaire not found" },
        { status: 404 }
      )
    }

    if (questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(questionnaire)
  } catch (error) {
    console.error("Failed to fetch questionnaire:", error)
    return NextResponse.json(
      { error: "Failed to fetch questionnaire" },
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

    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: params.id },
    })

    if (!questionnaire) {
      return NextResponse.json(
        { error: "Questionnaire not found" },
        { status: 404 }
      )
    }

    if (questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = questionnaireSchema.partial().parse(body)

    // Validate templateId if being changed
    if (data.templateId) {
      const template = await prisma.template.findUnique({
        where: { id: data.templateId },
      })
      if (!template || template.workspaceId !== user.workspaceId) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        )
      }
    }

    const updated = await prisma.questionnaire.update({
      where: { id: params.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.templateId !== undefined && { templateId: data.templateId }),
        ...(body.settings !== undefined && { settings: body.settings }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        template: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "updated",
      resourceType: "questionnaire",
      resourceId: updated.id,
      metadata: { changes: data },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update questionnaire:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to update questionnaire" },
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

    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: params.id },
    })

    if (!questionnaire) {
      return NextResponse.json(
        { error: "Questionnaire not found" },
        { status: 404 }
      )
    }

    if (questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.questionnaire.delete({
      where: { id: params.id },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "deleted",
      resourceType: "questionnaire",
      resourceId: params.id,
      metadata: { title: questionnaire.title },
    })

    return NextResponse.json({ message: "Questionnaire deleted" })
  } catch (error) {
    console.error("Failed to delete questionnaire:", error)
    return NextResponse.json(
      { error: "Failed to delete questionnaire" },
      { status: 500 }
    )
  }
}
