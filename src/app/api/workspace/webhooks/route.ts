import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { webhookSchema } from "@/lib/validations"
import { createAuditLog } from "@/lib/audit"
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

    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
    })

    // Mask secrets
    const masked = webhooks.map((w) => ({
      ...w,
      secret: w.secret.slice(0, 4) + "..." + w.secret.slice(-4),
    }))

    return NextResponse.json({ webhooks: masked })
  } catch (error) {
    console.error("Failed to fetch webhooks:", error)
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
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

    // Only OWNER and ADMIN can create webhooks
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = webhookSchema.parse(body)

    const secret = crypto.randomBytes(32).toString("hex")

    const webhook = await prisma.webhookEndpoint.create({
      data: {
        workspaceId: user.workspaceId,
        url: data.url,
        events: data.events as object,
        secret,
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "created",
      resourceType: "webhook",
      resourceId: webhook.id,
      metadata: { url: data.url, events: data.events },
    })

    // Return full secret only on creation
    return NextResponse.json(
      {
        webhook: {
          ...webhook,
          message: "Store the webhook secret securely. It will not be shown again.",
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create webhook:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create webhook" },
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

    // Only OWNER and ADMIN can update webhooks
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { webhookId, url, events, isActive } = body

    if (!webhookId || typeof webhookId !== "string") {
      return NextResponse.json(
        { error: "webhookId is required" },
        { status: 400 }
      )
    }

    const webhook = await prisma.webhookEndpoint.findUnique({
      where: { id: webhookId },
    })

    if (!webhook || webhook.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (url !== undefined) {
      // Validate URL
      try {
        new URL(url)
      } catch {
        return NextResponse.json(
          { error: "Invalid URL" },
          { status: 400 }
        )
      }
      updateData.url = url
    }

    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json(
          { error: "events must be a non-empty array" },
          { status: 400 }
        )
      }
      updateData.events = events
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id: webhookId },
      data: updateData,
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "updated",
      resourceType: "webhook",
      resourceId: webhookId,
      metadata: { changes: updateData },
    })

    return NextResponse.json({
      ...updated,
      secret: updated.secret.slice(0, 4) + "..." + updated.secret.slice(-4),
    })
  } catch (error) {
    console.error("Failed to update webhook:", error)
    return NextResponse.json(
      { error: "Failed to update webhook" },
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

    // Only OWNER and ADMIN can delete webhooks
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const webhookId = searchParams.get("webhookId")

    if (!webhookId) {
      return NextResponse.json(
        { error: "webhookId query parameter is required" },
        { status: 400 }
      )
    }

    const webhook = await prisma.webhookEndpoint.findUnique({
      where: { id: webhookId },
    })

    if (!webhook || webhook.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      )
    }

    await prisma.webhookEndpoint.delete({
      where: { id: webhookId },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "deleted",
      resourceType: "webhook",
      resourceId: webhookId,
      metadata: { url: webhook.url },
    })

    return NextResponse.json({ message: "Webhook deleted" })
  } catch (error) {
    console.error("Failed to delete webhook:", error)
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    )
  }
}
