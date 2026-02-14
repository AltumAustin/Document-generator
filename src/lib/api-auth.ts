import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function authenticateApiRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid Authorization header", status: 401 }
  }

  const key = authHeader.slice(7)

  const apiKey = await prisma.apiKey.findUnique({
    where: { key, isActive: true },
    include: { workspace: true },
  })

  if (!apiKey) {
    return { error: "Invalid API key", status: 401 }
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return { apiKey, workspace: apiKey.workspace }
}

export function withApiAuth(
  handler: (
    req: NextRequest,
    context: { workspaceId: string; permissions: string[] }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const result = await authenticateApiRequest(req)

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const permissions = result.apiKey.permissions as string[]
    return handler(req, {
      workspaceId: result.workspace.id,
      permissions,
    })
  }
}
