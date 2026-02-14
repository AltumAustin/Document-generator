import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const members = await prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Failed to fetch workspace members:", error)
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    // Only OWNER and ADMIN can change roles
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { memberId, role } = body

    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      )
    }

    if (!role || !["ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN, EDITOR, or VIEWER." },
        { status: 400 }
      )
    }

    const member = await prisma.user.findUnique({
      where: { id: memberId },
    })

    if (!member || member.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    // Cannot change OWNER role
    if (member.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 403 }
      )
    }

    // Cannot change your own role
    if (memberId === user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 403 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "role_changed",
      resourceType: "team_member",
      resourceId: memberId,
      metadata: {
        previousRole: member.role,
        newRole: role,
        memberEmail: member.email,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update member role:", error)
    return NextResponse.json(
      { error: "Failed to update member role" },
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

    // Only OWNER and ADMIN can remove members
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get("memberId")

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId query parameter is required" },
        { status: 400 }
      )
    }

    const member = await prisma.user.findUnique({
      where: { id: memberId },
    })

    if (!member || member.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    // Cannot remove OWNER
    if (member.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the workspace owner" },
        { status: 403 }
      )
    }

    // Cannot remove yourself
    if (memberId === user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself. Use leave workspace instead." },
        { status: 403 }
      )
    }

    // Remove from workspace (set workspaceId to null)
    await prisma.user.update({
      where: { id: memberId },
      data: { workspaceId: null, role: "EDITOR" },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "deleted",
      resourceType: "team_member",
      resourceId: memberId,
      metadata: { memberEmail: member.email },
    })

    return NextResponse.json({ message: "Member removed from workspace" })
  } catch (error) {
    console.error("Failed to remove member:", error)
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
