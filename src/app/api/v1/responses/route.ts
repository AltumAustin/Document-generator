import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateApiRequest } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req)

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { workspace, apiKey } = authResult
    const permissions = apiKey.permissions as string[]

    // Check for read permission
    if (
      !permissions.includes("read") &&
      !permissions.includes("write") &&
      !permissions.includes("admin")
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires 'read', 'write', or 'admin'." },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const questionnaireId = searchParams.get("questionnaireId") || ""
    const status = searchParams.get("status") || ""
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      questionnaire: {
        workspaceId: workspace.id,
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
        select: {
          id: true,
          questionnaireId: true,
          respondentEmail: true,
          respondentName: true,
          answers: true,
          status: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          generatedDocs: {
            select: {
              id: true,
              fileName: true,
              format: true,
              generatedAt: true,
            },
          },
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
    console.error("API v1 responses error:", error)
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    )
  }
}
