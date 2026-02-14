import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const health: {
    status: string
    timestamp: string
    database: string
    uptime: number
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "unknown",
    uptime: process.uptime(),
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    health.database = "connected"
  } catch (error) {
    console.error("Health check database error:", error)
    health.status = "degraded"
    health.database = "disconnected"
  }

  const statusCode = health.status === "ok" ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
