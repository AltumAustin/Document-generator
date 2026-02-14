import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { conditionalLogicSchema } from "@/lib/validations"
import { z } from "zod"

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

    const logic = await prisma.conditionalLogic.findMany({
      where: { questionnaireId: params.id },
      include: {
        field: { select: { id: true, label: true, variable: true } },
      },
    })

    return NextResponse.json({ logic })
  } catch (error) {
    console.error("Failed to fetch conditional logic:", error)
    return NextResponse.json(
      { error: "Failed to fetch conditional logic" },
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
    const data = conditionalLogicSchema.parse(body)

    const logic = await prisma.conditionalLogic.create({
      data: {
        questionnaireId: params.id,
        fieldId: data.fieldId,
        conditions: data.conditions as object,
        action: data.action,
        targetFieldId: data.targetFieldId,
      },
      include: {
        field: { select: { id: true, label: true, variable: true } },
      },
    })

    return NextResponse.json(logic, { status: 201 })
  } catch (error) {
    console.error("Failed to create conditional logic:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create conditional logic" },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const bulkSchema = z.array(
      conditionalLogicSchema.extend({ id: z.string().optional() })
    )
    const rules = bulkSchema.parse(body.logic)

    const result = await prisma.$transaction(async (tx) => {
      // Get IDs of rules being kept
      const existingIds = rules
        .filter((r) => r.id)
        .map((r) => r.id as string)

      // Delete rules not in the new list
      await tx.conditionalLogic.deleteMany({
        where: {
          questionnaireId: params.id,
          id: { notIn: existingIds },
        },
      })

      // Upsert each rule
      const upserted = await Promise.all(
        rules.map((rule) =>
          rule.id
            ? tx.conditionalLogic.update({
                where: { id: rule.id },
                data: {
                  fieldId: rule.fieldId,
                  conditions: rule.conditions as object,
                  action: rule.action,
                  targetFieldId: rule.targetFieldId,
                },
              })
            : tx.conditionalLogic.create({
                data: {
                  questionnaireId: params.id,
                  fieldId: rule.fieldId,
                  conditions: rule.conditions as object,
                  action: rule.action,
                  targetFieldId: rule.targetFieldId,
                },
              })
        )
      )

      return upserted
    })

    return NextResponse.json({ logic: result })
  } catch (error) {
    console.error("Failed to bulk update conditional logic:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to update conditional logic" },
      { status: 500 }
    )
  }
}
