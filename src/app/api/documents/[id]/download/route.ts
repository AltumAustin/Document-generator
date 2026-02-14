import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { getSignedDownloadUrl } from "@/lib/s3"
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

    const document = await prisma.generatedDocument.findUnique({
      where: { id: params.id },
      include: {
        response: {
          include: {
            questionnaire: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    if (document.response.questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const signedUrl = await getSignedDownloadUrl(document.fileUrl)

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "downloaded",
      resourceType: "document",
      resourceId: document.id,
      metadata: { fileName: document.fileName },
    })

    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error("Failed to download document:", error)
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    )
  }
}
