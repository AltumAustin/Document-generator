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
    const category = searchParams.get("category") || ""
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      workspaceId: workspace.id,
      isActive: true,
    }

    if (category) {
      where.category = category
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          variables: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.template.count({ where }),
    ])

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("API v1 templates error:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}
