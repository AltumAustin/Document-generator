import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { apiKeySchema } from "@/lib/validations"
import { createAuditLog } from "@/lib/audit"
import crypto from "crypto"

function maskApiKey(key: string): string {
  if (key.length <= 8) return "****"
  return key.slice(0, 4) + "..." + key.slice(-4)
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace selected" }, { status: 400 })
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
    })

    // Mask the keys before returning
    const maskedKeys = apiKeys.map((k) => ({
      ...k,
      key: maskApiKey(k.key),
    }))

    return NextResponse.json({ apiKeys: maskedKeys })
  } catch (error) {
    console.error("Failed to fetch API keys:", error)
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
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

    // Only OWNER and ADMIN can create API keys
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = apiKeySchema.parse(body)

    // Generate a unique API key
    const keyPrefix = "dg_"
    const keyValue = crypto.randomBytes(32).toString("hex")
    const key = `${keyPrefix}${keyValue}`

    const apiKey = await prisma.apiKey.create({
      data: {
        workspaceId: user.workspaceId,
        name: data.name,
        key,
        permissions: data.permissions as object,
      },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "created",
      resourceType: "api_key",
      resourceId: apiKey.id,
      metadata: { name: data.name },
    })

    // Return the full key only on creation
    return NextResponse.json(
      {
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.key, // Full key shown only once
          permissions: apiKey.permissions,
          createdAt: apiKey.createdAt,
        },
        message: "Store this key securely. It will not be shown again.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create API key:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create API key" },
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

    // Only OWNER and ADMIN can deactivate API keys
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const keyId = searchParams.get("keyId")

    if (!keyId) {
      return NextResponse.json(
        { error: "keyId query parameter is required" },
        { status: 400 }
      )
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    })

    if (!apiKey || apiKey.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      )
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    })

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "deleted",
      resourceType: "api_key",
      resourceId: keyId,
      metadata: { name: apiKey.name },
    })

    return NextResponse.json({ message: "API key deactivated" })
  } catch (error) {
    console.error("Failed to deactivate API key:", error)
    return NextResponse.json(
      { error: "Failed to deactivate API key" },
      { status: 500 }
    )
  }
}
