import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { questionnaireSchema } from "@/lib/validations"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const templateId = searchParams.get("templateId") || ""
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      workspaceId: user.workspaceId,
      isActive: true,
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (templateId) {
      where.templateId = templateId
    }

    const [questionnaires, total] = await Promise.all([
      prisma.questionnaire.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        include: {
          template: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { fields: true, responses: true, sharedLinks: true } },
        },
      }),
      prisma.questionnaire.count({ where }),
    ])

    return NextResponse.json({
      questionnaires,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Failed to fetch questionnaires:", error)
    return NextResponse.json(
      { error: "Failed to fetch questionnaires" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const body = await req.json()
    const data = questionnaireSchema.parse(body)

    // Validate templateId belongs to workspace if provided
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

    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: data.title,
        description: data.description,
        templateId: data.templateId,
        workspaceId: user.workspaceId,
        createdById: user.id,
      },
      include: {
        template: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "created",
      resourceType: "questionnaire",
      resourceId: questionnaire.id,
      metadata: { title: questionnaire.title },
    })

    return NextResponse.json(questionnaire, { status: 201 })
  } catch (error) {
    console.error("Failed to create questionnaire:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create questionnaire" },
      { status: 500 }
    )
  }
}
