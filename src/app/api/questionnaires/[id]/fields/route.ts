import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { fieldSchema } from "@/lib/validations"
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

    const fields = await prisma.questionnaireField.findMany({
      where: { questionnaireId: params.id },
      orderBy: { order: "asc" },
    })

    return NextResponse.json({ fields })
  } catch (error) {
    console.error("Failed to fetch fields:", error)
    return NextResponse.json(
      { error: "Failed to fetch fields" },
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
    const data = fieldSchema.parse(body)

    // Auto-assign order if not provided or zero
    if (!data.order) {
      const lastField = await prisma.questionnaireField.findFirst({
        where: { questionnaireId: params.id },
        orderBy: { order: "desc" },
      })
      data.order = (lastField?.order ?? 0) + 1
    }

    const field = await prisma.questionnaireField.create({
      data: {
        questionnaireId: params.id,
        type: data.type,
        label: data.label,
        variable: data.variable,
        description: data.description,
        placeholder: data.placeholder,
        options: data.options as object,
        validation: data.validation as object,
        defaultValue: data.defaultValue,
        section: data.section,
        order: data.order,
        isRequired: data.isRequired,
        config: data.config as object,
      },
    })

    return NextResponse.json(field, { status: 201 })
  } catch (error) {
    console.error("Failed to create field:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create field" },
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
      fieldSchema.extend({ id: z.string().optional() })
    )
    const fields = bulkSchema.parse(body.fields)

    // Delete existing fields and recreate in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Remove fields that are not in the new list
      const existingIds = fields
        .filter((f) => f.id)
        .map((f) => f.id as string)

      await tx.questionnaireField.deleteMany({
        where: {
          questionnaireId: params.id,
          id: { notIn: existingIds },
        },
      })

      // Upsert each field
      const upserted = await Promise.all(
        fields.map((field, index) =>
          field.id
            ? tx.questionnaireField.update({
                where: { id: field.id },
                data: {
                  type: field.type,
                  label: field.label,
                  variable: field.variable,
                  description: field.description,
                  placeholder: field.placeholder,
                  options: field.options as object,
                  validation: field.validation as object,
                  defaultValue: field.defaultValue,
                  section: field.section,
                  order: index,
                  isRequired: field.isRequired,
                  config: field.config as object,
                },
              })
            : tx.questionnaireField.create({
                data: {
                  questionnaireId: params.id,
                  type: field.type,
                  label: field.label,
                  variable: field.variable,
                  description: field.description,
                  placeholder: field.placeholder,
                  options: field.options as object,
                  validation: field.validation as object,
                  defaultValue: field.defaultValue,
                  section: field.section,
                  order: index,
                  isRequired: field.isRequired,
                  config: field.config as object,
                },
              })
        )
      )

      return upserted
    })

    return NextResponse.json({ fields: result })
  } catch (error) {
    console.error("Failed to bulk update fields:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to update fields" },
      { status: 500 }
    )
  }
}
