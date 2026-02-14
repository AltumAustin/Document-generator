import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { responseSchema } from "@/lib/validations"
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
    const questionnaireId = searchParams.get("questionnaireId") || ""
    const status = searchParams.get("status") || ""
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      questionnaire: {
        workspaceId: user.workspaceId,
      },
    }

    if (questionnaireId) {
      where.questionnaireId = questionnaireId
    }

    if (status) {
      where.status = status
    }

    const [responses, total] = await Promise.all([
      prisma.response.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          questionnaire: { select: { id: true, title: true } },
          _count: { select: { generatedDocs: true } },
        },
      }),
      prisma.response.count({ where }),
    ])

    return NextResponse.json({
      responses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Failed to fetch responses:", error)
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = responseSchema.parse(body)

    // Verify questionnaire exists and is active
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id: data.questionnaireId },
      include: {
        workspace: true,
      },
    })

    if (!questionnaire || !questionnaire.isActive) {
      return NextResponse.json(
        { error: "Questionnaire not found or inactive" },
        { status: 404 }
      )
    }

    // If this comes from a shared link, check the slug
    const slug = body.slug as string | undefined
    if (slug) {
      const sharedLink = await prisma.sharedLink.findUnique({
        where: { slug },
      })

      if (!sharedLink || !sharedLink.isActive) {
        return NextResponse.json(
          { error: "Shared link not found or inactive" },
          { status: 404 }
        )
      }

      if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
        return NextResponse.json(
          { error: "Shared link has expired" },
          { status: 410 }
        )
      }

      if (
        sharedLink.maxResponses &&
        sharedLink.responseCount >= sharedLink.maxResponses
      ) {
        return NextResponse.json(
          { error: "Maximum responses reached" },
          { status: 410 }
        )
      }

      // Increment response count
      await prisma.sharedLink.update({
        where: { id: sharedLink.id },
        data: { responseCount: { increment: 1 } },
      })
    }

    // Check auth for non-public submissions
    if (!slug) {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const response = await prisma.response.create({
      data: {
        questionnaireId: data.questionnaireId,
        respondentEmail: data.respondentEmail,
        respondentName: data.respondentName,
        answers: data.answers as object,
        status: body.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        completedAt: body.status === "COMPLETED" ? new Date() : null,
        metadata: (body.metadata || {}) as object,
      },
      include: {
        questionnaire: { select: { id: true, title: true } },
      },
    })

    await createAuditLog({
      workspaceId: questionnaire.workspaceId,
      action: "created",
      resourceType: "response",
      resourceId: response.id,
      metadata: {
        questionnaireId: data.questionnaireId,
        respondentEmail: data.respondentEmail,
        isPublic: !!slug,
      },
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("Failed to create response:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create response" },
      { status: 500 }
    )
  }
}
