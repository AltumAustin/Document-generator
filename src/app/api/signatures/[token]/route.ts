import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { uploadFile } from "@/lib/s3"
import { fireWebhooks } from "@/lib/webhooks"
import { createAuditLog } from "@/lib/audit"

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { token: params.token },
      include: {
        document: {
          include: {
            template: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!signatureRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 }
      )
    }

    // Check if expired
    if (
      signatureRequest.expiresAt &&
      new Date() > signatureRequest.expiresAt
    ) {
      return NextResponse.json(
        { error: "This signature request has expired" },
        { status: 410 }
      )
    }

    // Check if already signed or declined
    if (signatureRequest.status === "SIGNED") {
      return NextResponse.json(
        { error: "This document has already been signed" },
        { status: 409 }
      )
    }

    if (signatureRequest.status === "DECLINED") {
      return NextResponse.json(
        { error: "This signature request was declined" },
        { status: 409 }
      )
    }

    // Update status to VIEWED if still PENDING
    if (signatureRequest.status === "PENDING") {
      await prisma.signatureRequest.update({
        where: { id: signatureRequest.id },
        data: { status: "VIEWED" },
      })
    }

    return NextResponse.json({
      id: signatureRequest.id,
      signerEmail: signatureRequest.signerEmail,
      signerName: signatureRequest.signerName,
      message: signatureRequest.message,
      status: signatureRequest.status === "PENDING" ? "VIEWED" : signatureRequest.status,
      document: {
        id: signatureRequest.document.id,
        fileName: signatureRequest.document.fileName,
        format: signatureRequest.document.format,
        template: signatureRequest.document.template,
      },
    })
  } catch (error) {
    console.error("Failed to fetch signature request:", error)
    return NextResponse.json(
      { error: "Failed to load signature request" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { token: params.token },
      include: {
        document: {
          include: {
            response: {
              include: {
                questionnaire: true,
              },
            },
          },
        },
      },
    })

    if (!signatureRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 }
      )
    }

    if (
      signatureRequest.expiresAt &&
      new Date() > signatureRequest.expiresAt
    ) {
      return NextResponse.json(
        { error: "This signature request has expired" },
        { status: 410 }
      )
    }

    if (signatureRequest.status === "SIGNED") {
      return NextResponse.json(
        { error: "This document has already been signed" },
        { status: 409 }
      )
    }

    if (signatureRequest.status === "DECLINED") {
      return NextResponse.json(
        { error: "This signature request was declined" },
        { status: 409 }
      )
    }

    const body = await req.json()
    const { signatureImage } = body

    if (!signatureImage || typeof signatureImage !== "string") {
      return NextResponse.json(
        { error: "signatureImage (base64) is required" },
        { status: 400 }
      )
    }

    // Validate base64 format
    const base64Match = signatureImage.match(
      /^data:image\/(png|jpeg|svg\+xml);base64,(.+)$/
    )
    if (!base64Match) {
      return NextResponse.json(
        { error: "Invalid signature image format. Expected base64 data URI." },
        { status: 400 }
      )
    }

    const imageType = base64Match[1]
    const base64Data = base64Match[2]
    const buffer = Buffer.from(base64Data, "base64")

    // Upload signature image to S3
    const { key } = await uploadFile(
      buffer,
      `signature-${signatureRequest.id}.${imageType === "svg+xml" ? "svg" : imageType}`,
      `image/${imageType}`,
      "signatures"
    )

    // Get client IP
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"

    // Update signature request
    const updated = await prisma.signatureRequest.update({
      where: { id: signatureRequest.id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        signatureUrl: key,
        ipAddress,
      },
    })

    // Fire webhook
    const workspaceId =
      signatureRequest.document.response.questionnaire.workspaceId

    await fireWebhooks(workspaceId, "signature.completed", {
      signatureRequestId: updated.id,
      documentId: signatureRequest.documentId,
      signerEmail: signatureRequest.signerEmail,
      signedAt: updated.signedAt,
    })

    await createAuditLog({
      workspaceId,
      action: "signed",
      resourceType: "signature",
      resourceId: updated.id,
      metadata: {
        documentId: signatureRequest.documentId,
        signerEmail: signatureRequest.signerEmail,
        ipAddress,
      },
    })

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      signedAt: updated.signedAt,
      message: "Document signed successfully",
    })
  } catch (error) {
    console.error("Failed to submit signature:", error)
    return NextResponse.json(
      { error: "Failed to submit signature" },
      { status: 500 }
    )
  }
}
