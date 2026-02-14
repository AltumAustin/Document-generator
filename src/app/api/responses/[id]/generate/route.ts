import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { downloadFile, uploadFile } from "@/lib/s3"
import { generateDocument } from "@/lib/document-engine"
import { fireWebhooks } from "@/lib/webhooks"
import { createAuditLog } from "@/lib/audit"

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

    const body = await req.json()
    const { format, templateId } = body

    if (!format || !["DOCX", "PDF", "HTML"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Must be DOCX, PDF, or HTML." },
        { status: 400 }
      )
    }

    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      )
    }

    // Load the response
    const response = await prisma.response.findUnique({
      where: { id: params.id },
      include: {
        questionnaire: {
          include: {
            fields: true,
          },
        },
      },
    })

    if (!response) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      )
    }

    if (response.questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Load the template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    if (template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!template.fileUrl) {
      return NextResponse.json(
        { error: "Template has no uploaded file" },
        { status: 400 }
      )
    }

    // Download template from S3
    const templateBuffer = await downloadFile(template.fileUrl)

    // Generate the document
    const answers = response.answers as Record<string, unknown>
    const fields = response.questionnaire.fields.map((f) => ({
      variable: f.variable,
      type: f.type,
      config: f.config as Record<string, unknown>,
      options: f.options as Array<{ label: string; value: string }>,
    }))

    const formatLower = format.toLowerCase() as "docx" | "pdf" | "html"
    const result = await generateDocument(
      templateBuffer,
      answers,
      fields,
      formatLower,
      template.name
    )

    // Build output filename
    const extension = format.toLowerCase()
    const fileName = `${template.name.replace(/[^a-zA-Z0-9]/g, "_")}_${response.id}.${extension}`

    // Upload generated document to S3
    const { key, url } = await uploadFile(
      result.buffer,
      fileName,
      result.contentType,
      "generated"
    )

    // Create GeneratedDocument record
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
    await fireWebhooks(user.workspaceId, "document.generated", {
      documentId: generatedDoc.id,
      responseId: response.id,
      templateId: template.id,
      format,
      fileName,
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "generated",
      resourceType: "document",
      resourceId: generatedDoc.id,
      metadata: {
        responseId: response.id,
        templateId: template.id,
        format,
        fileName,
      },
    })

    return NextResponse.json({
      document: {
        id: generatedDoc.id,
        fileName: generatedDoc.fileName,
        format: generatedDoc.format,
        fileSize: generatedDoc.fileSize,
        fileUrl: url,
        generatedAt: generatedDoc.generatedAt,
      },
    })
  } catch (error) {
    console.error("Failed to generate document:", error)
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    )
  }
}
