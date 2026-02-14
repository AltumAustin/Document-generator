import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
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

    const template = await prisma.template.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const versions = await prisma.templateVersion.findMany({
      where: { templateId: params.id },
      orderBy: { version: "desc" },
    })

    return NextResponse.json({ versions })
  } catch (error) {
    console.error("Failed to fetch template versions:", error)
    return NextResponse.json(
      { error: "Failed to fetch template versions" },
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

    const template = await prisma.template.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    if (template.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { versionId } = body

    if (!versionId || typeof versionId !== "string") {
      return NextResponse.json(
        { error: "versionId is required" },
        { status: 400 }
      )
    }

    const version = await prisma.templateVersion.findUnique({
      where: { id: versionId },
    })

    if (!version || version.templateId !== params.id) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      )
    }

    // Snapshot current state before rollback
    if (template.fileUrl) {
      await prisma.templateVersion.create({
        data: {
          templateId: template.id,
          version: template.version,
          fileUrl: template.fileUrl,
          fileName: template.fileName,
          variables: template.variables as object,
          changelog: `Snapshot before rollback to version ${version.version}`,
        },
      })
    }

    const newVersion = template.version + 1

    // Copy the version's data to the main template
    const updated = await prisma.template.update({
      where: { id: params.id },
      data: {
        fileUrl: version.fileUrl,
        fileName: version.fileName,
        variables: version.variables as object,
        version: newVersion,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    // Record the rollback as a new version
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: newVersion,
        fileUrl: version.fileUrl,
        fileName: version.fileName,
        variables: version.variables as object,
        changelog: `Rolled back to version ${version.version}`,
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "updated",
      resourceType: "template",
      resourceId: template.id,
      metadata: {
        action: "rollback",
        fromVersion: template.version,
        toVersion: version.version,
        newVersion,
      },
    })

    return NextResponse.json({
      template: updated,
      message: `Rolled back to version ${version.version}`,
    })
  } catch (error) {
    console.error("Failed to rollback template version:", error)
    return NextResponse.json(
      { error: "Failed to rollback template version" },
      { status: 500 }
    )
  }
}
