import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: string
  workspaceId: string | null
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session.user as SessionUser
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireWorkspace(): Promise<{ user: SessionUser; workspaceId: string }> {
  const user = await requireAuth()
  if (!user.workspaceId) {
    throw new Error("No workspace selected")
  }
  return { user, workspaceId: user.workspaceId }
}

export function withAuth(
  handler: (req: NextRequest, context: { user: SessionUser }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAuth()
      return handler(req, { user })
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
}

export function withWorkspace(
  handler: (
    req: NextRequest,
    context: { user: SessionUser; workspaceId: string }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const { user, workspaceId } = await requireWorkspace()
      return handler(req, { user, workspaceId })
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
}

export async function validateApiKey(key: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key, isActive: true },
    include: { workspace: true },
  })

  if (!apiKey) return null

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return apiKey
}
