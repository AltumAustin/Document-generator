import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { teamInviteSchema } from "@/lib/validations"
import { createAuditLog } from "@/lib/audit"
import { sendEmail, teamInvitationEmail } from "@/lib/email"
import crypto from "crypto"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("Failed to fetch invitations:", error)
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    // Only OWNER and ADMIN can invite
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = teamInviteSchema.parse(body)

    // Check if user already in workspace
    const existingMember = await prisma.user.findFirst({
      where: {
        email: data.email,
        workspaceId: user.workspaceId,
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this workspace" },
        { status: 409 }
      )
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        email: data.email,
        workspaceId: user.workspaceId,
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 409 }
      )
    }

    const token = crypto.randomBytes(32).toString("hex")

    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
    })

    const invitation = await prisma.teamInvitation.create({
      data: {
        email: data.email,
        role: data.role,
        token,
        workspaceId: user.workspaceId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`
    const emailContent = teamInvitationEmail({
      inviteeEmail: data.email,
      workspaceName: workspace?.name || "Workspace",
      inviterName: user.name || user.email,
      inviteUrl,
      role: data.role,
    })

    await sendEmail({
      to: data.email,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "invited",
      resourceType: "team_member",
      resourceId: invitation.id,
      metadata: {
        inviteeEmail: data.email,
        role: data.role,
      },
    })

    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    console.error("Failed to create invitation:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    // Only OWNER and ADMIN can cancel invitations
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const invitationId = searchParams.get("invitationId")

    if (!invitationId) {
      return NextResponse.json(
        { error: "invitationId query parameter is required" },
        { status: 400 }
      )
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    })

    if (!invitation || invitation.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    await prisma.teamInvitation.delete({
      where: { id: invitationId },
    })

    return NextResponse.json({ message: "Invitation cancelled" })
  } catch (error) {
    console.error("Failed to cancel invitation:", error)
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    )
  }
}
