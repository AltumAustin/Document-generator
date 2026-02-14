import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { fieldSchema } from "@/lib/validations"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
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

    const field = await prisma.questionnaireField.findUnique({
      where: { id: params.fieldId },
    })

    if (!field || field.questionnaireId !== params.id) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = fieldSchema.partial().parse(body)

    const updated = await prisma.questionnaireField.update({
      where: { id: params.fieldId },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.variable !== undefined && { variable: data.variable }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.placeholder !== undefined && { placeholder: data.placeholder }),
        ...(data.options !== undefined && { options: data.options as object }),
        ...(data.validation !== undefined && { validation: data.validation as object }),
        ...(data.defaultValue !== undefined && { defaultValue: data.defaultValue }),
        ...(data.section !== undefined && { section: data.section }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.config !== undefined && { config: data.config as object }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update field:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to update field" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
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

    const field = await prisma.questionnaireField.findUnique({
      where: { id: params.fieldId },
    })

    if (!field || field.questionnaireId !== params.id) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 })
    }

    await prisma.questionnaireField.delete({
      where: { id: params.fieldId },
    })

    return NextResponse.json({ message: "Field deleted" })
  } catch (error) {
    console.error("Failed to delete field:", error)
    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 }
    )
  }
}
