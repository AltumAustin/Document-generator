import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { signatureRequestSchema } from "@/lib/validations"
import { createAuditLog } from "@/lib/audit"
import { sendEmail, signatureRequestEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const body = await req.json()
    const data = signatureRequestSchema.parse(body)

    // Verify document belongs to workspace
    const document = await prisma.generatedDocument.findUnique({
      where: { id: data.documentId },
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

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex")

    const signatureRequest = await prisma.signatureRequest.create({
      data: {
        documentId: data.documentId,
        signerEmail: data.signerEmail,
        signerName: data.signerName,
        token,
        message: data.message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // Send email notification
    const signUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign/${token}`
    const emailContent = signatureRequestEmail({
      signerName: data.signerName || data.signerEmail,
      documentName: document.fileName,
      senderName: user.name || user.email,
      signUrl,
      message: data.message,
    })

    await sendEmail({
      to: data.signerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "created",
      resourceType: "signature",
      resourceId: signatureRequest.id,
      metadata: {
        documentId: data.documentId,
        signerEmail: data.signerEmail,
      },
    })

    return NextResponse.json(signatureRequest, { status: 201 })
  } catch (error) {
    console.error("Failed to create signature request:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create signature request" },
      { status: 500 }
    )
  }
}
