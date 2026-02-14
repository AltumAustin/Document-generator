import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const sharedLink = await prisma.sharedLink.findUnique({
      where: { slug: params.slug },
      include: {
        questionnaire: {
          include: {
            fields: { orderBy: { order: "asc" } },
            conditionalLogic: true,
            template: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!sharedLink) {
      return NextResponse.json(
        { error: "Shared link not found" },
        { status: 404 }
      )
    }

    // Check if link is active
    if (!sharedLink.isActive) {
      return NextResponse.json(
        { error: "This link is no longer active" },
        { status: 410 }
      )
    }

    // Check if link has expired
    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      return NextResponse.json(
        { error: "This link has expired" },
        { status: 410 }
      )
    }

    // Check if max responses reached
    if (
      sharedLink.maxResponses &&
      sharedLink.responseCount >= sharedLink.maxResponses
    ) {
      return NextResponse.json(
        { error: "This form has reached its maximum number of responses" },
        { status: 410 }
      )
    }

    // Check if questionnaire is active
    if (!sharedLink.questionnaire.isActive) {
      return NextResponse.json(
        { error: "This questionnaire is no longer active" },
        { status: 410 }
      )
    }

    return NextResponse.json({
      questionnaire: {
        id: sharedLink.questionnaire.id,
        title: sharedLink.questionnaire.title,
        description: sharedLink.questionnaire.description,
        settings: sharedLink.questionnaire.settings,
        fields: sharedLink.questionnaire.fields,
        conditionalLogic: sharedLink.questionnaire.conditionalLogic,
        template: sharedLink.questionnaire.template,
      },
      branding: sharedLink.branding,
      slug: sharedLink.slug,
    })
  } catch (error) {
    console.error("Failed to fetch shared questionnaire:", error)
    return NextResponse.json(
      { error: "Failed to load questionnaire" },
      { status: 500 }
    )
  }
}
