import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { uploadFile } from "@/lib/s3"
import { parseTemplateVariables } from "@/lib/document-engine/template-parser"
import { createAuditLog } from "@/lib/audit"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

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

    const template = await prisma.template.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only .docx files are allowed." },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 10MB limit." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3
    const { key, url } = await uploadFile(
      buffer,
      file.name,
      file.type,
      "templates"
    )

    // Parse template variables
    const variables = parseTemplateVariables(buffer)

    const newVersion = template.version + 1

    // Create a version snapshot of the current state before updating
    if (template.fileUrl) {
      await prisma.templateVersion.create({
        data: {
          templateId: template.id,
          version: template.version,
          fileUrl: template.fileUrl,
          fileName: template.fileName,
          variables: template.variables as object,
          changelog: `Version ${template.version} snapshot before upload`,
        },
      })
    }

    // Update the template with the new file
    const updated = await prisma.template.update({
      where: { id: params.id },
      data: {
        fileUrl: key,
        fileName: file.name,
        variables: JSON.parse(JSON.stringify(variables)),
        version: newVersion,
      },
    })

    // Create a version record for the new version
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: newVersion,
        fileUrl: key,
        fileName: file.name,
        variables: JSON.parse(JSON.stringify(variables)),
        changelog: `Uploaded ${file.name}`,
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "updated",
      resourceType: "template",
      resourceId: template.id,
      metadata: {
        action: "file_upload",
        fileName: file.name,
        version: newVersion,
        variableCount: variables.length,
      },
    })

    return NextResponse.json({
      template: updated,
      variables,
      fileUrl: url,
      version: newVersion,
    })
  } catch (error) {
    console.error("Failed to upload template file:", error)
    return NextResponse.json(
      { error: "Failed to upload template file" },
      { status: 500 }
    )
  }
}
