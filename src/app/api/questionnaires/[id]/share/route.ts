import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { sharedLinkSchema } from "@/lib/validations"
import { generateSlug } from "@/lib/utils"
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

    const sharedLinks = await prisma.sharedLink.findMany({
      where: { questionnaireId: params.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ sharedLinks })
  } catch (error) {
    console.error("Failed to fetch shared links:", error)
    return NextResponse.json(
      { error: "Failed to fetch shared links" },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const data = sharedLinkSchema.parse({
      ...body,
      questionnaireId: params.id,
    })

    // Generate a unique slug
    let slug = generateSlug()
    let attempts = 0
    while (await prisma.sharedLink.findUnique({ where: { slug } })) {
      slug = generateSlug()
      attempts++
      if (attempts > 10) {
        return NextResponse.json(
          { error: "Failed to generate unique link" },
          { status: 500 }
        )
      }
    }

    const sharedLink = await prisma.sharedLink.create({
      data: {
        questionnaireId: params.id,
        slug,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        branding: data.branding as object,
        maxResponses: data.maxResponses,
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "shared",
      resourceType: "shared_link",
      resourceId: sharedLink.id,
      metadata: { questionnaireId: params.id, slug },
    })

    return NextResponse.json(sharedLink, { status: 201 })
  } catch (error) {
    console.error("Failed to create shared link:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create shared link" },
      { status: 500 }
    )
  }
}
