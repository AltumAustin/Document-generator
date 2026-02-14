import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateApiRequest } from "@/lib/api-auth"
import { downloadFile, uploadFile } from "@/lib/s3"
import { generateDocument } from "@/lib/document-engine"
import { fireWebhooks } from "@/lib/webhooks"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req)

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { apiKey, workspace } = authResult
    const permissions = apiKey.permissions as string[]

    // Check for write permission
    if (!permissions.includes("write") && !permissions.includes("admin")) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires 'write' or 'admin'." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { templateId, answers, format } = body

    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      )
    }

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "answers object is required" },
        { status: 400 }
      )
    }

    if (!format || !["DOCX", "PDF", "HTML"].includes(format)) {
      return NextResponse.json(
        { error: "format is required and must be DOCX, PDF, or HTML" },
        { status: 400 }
      )
    }

    // Load template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    })

    if (!template || template.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    if (!template.fileUrl) {
      return NextResponse.json(
        { error: "Template has no uploaded file" },
        { status: 400 }
      )
    }

    // If a questionnaireId is provided, load its fields for variable resolution
    let fields: Array<{
      variable: string
      type: string
      config?: Record<string, unknown>
      options?: Array<{ label: string; value: string }>
    }> = []

    if (body.questionnaireId) {
      const questionnaire = await prisma.questionnaire.findUnique({
        where: { id: body.questionnaireId },
        include: { fields: true },
      })
      if (questionnaire && questionnaire.workspaceId === workspace.id) {
        fields = questionnaire.fields.map((f) => ({
          variable: f.variable,
          type: f.type,
          config: f.config as Record<string, unknown>,
          options: f.options as Array<{ label: string; value: string }>,
        }))
      }
    }

    // Find or create a questionnaire for this API-generated response
    let questionnaireId = body.questionnaireId as string | undefined
    if (!questionnaireId) {
      const existingQ = await prisma.questionnaire.findFirst({
        where: { templateId: template.id, workspaceId: workspace.id },
      })
      if (existingQ) {
        questionnaireId = existingQ.id
      } else {
        const newQ = await prisma.questionnaire.create({
          data: {
            title: `${template.name} (API)`,
            templateId: template.id,
            workspaceId: workspace.id,
            createdById: (await prisma.user.findFirst({ where: { workspaceId: workspace.id } }))!.id,
          },
        })
        questionnaireId = newQ.id
      }
    }

    const response = await prisma.response.create({
      data: {
        questionnaireId,
        answers: answers as object,
        status: "COMPLETED",
        completedAt: new Date(),
        respondentEmail: "api@generated",
        metadata: { source: "api", apiKeyId: apiKey.id } as object,
      },
    })

    // Download template from S3
    const templateBuffer = await downloadFile(template.fileUrl)

    // Generate document
    const formatLower = format.toLowerCase() as "docx" | "pdf" | "html"
    const result = await generateDocument(
      templateBuffer,
      answers as Record<string, unknown>,
      fields,
      formatLower,
      template.name
    )

    const extension = format.toLowerCase()
    const fileName = `${template.name.replace(/[^a-zA-Z0-9]/g, "_")}_${response.id}.${extension}`

    // Upload to S3
    const { key, url } = await uploadFile(
      result.buffer,
      fileName,
      result.contentType,
      "generated"
    )

    // Create document record
    const generatedDoc = await prisma.generatedDocument.create({
      data: {
        responseId: response.id,
        templateId: template.id,
        fileUrl: key,
        fileName,
        format: format as "DOCX" | "PDF" | "HTML",
        fileSize: result.buffer.length,
      },
    })

    // Fire webhook
    await fireWebhooks(workspace.id, "document.generated", {
      documentId: generatedDoc.id,
      responseId: response.id,
      templateId: template.id,
      format,
      fileName,
      source: "api",
    })

    await createAuditLog({
      workspaceId: workspace.id,
      action: "generated",
      resourceType: "document",
      resourceId: generatedDoc.id,
      metadata: {
        templateId: template.id,
        format,
        source: "api",
        apiKeyId: apiKey.id,
      },
    })

    return NextResponse.json({
      document: {
        id: generatedDoc.id,
        fileName: generatedDoc.fileName,
        format: generatedDoc.format,
        fileSize: generatedDoc.fileSize,
        downloadUrl: url,
        generatedAt: generatedDoc.generatedAt,
      },
      responseId: response.id,
    })
  } catch (error) {
    console.error("API v1 generate error:", error)
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    )
  }
}
