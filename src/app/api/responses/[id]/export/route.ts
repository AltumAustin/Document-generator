import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { stringify } from "csv-stringify/sync"
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

    const response = await prisma.response.findUnique({
      where: { id: params.id },
      include: {
        questionnaire: {
          include: {
            fields: { orderBy: { order: "asc" } },
          },
        },
      },
    })

    if (!response) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      )
    }

    if (response.questionnaire.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const answers = response.answers as Record<string, unknown>
    const fields = response.questionnaire.fields

    // Build CSV header and data rows
    const headers = [
      "Response ID",
      "Respondent Email",
      "Respondent Name",
      "Status",
      "Submitted At",
      ...fields.map((f) => f.label),
    ]

    const row = [
      response.id,
      response.respondentEmail || "",
      response.respondentName || "",
      response.status,
      response.completedAt?.toISOString() || response.createdAt.toISOString(),
      ...fields.map((f) => {
        const val = answers[f.variable]
        if (val === null || val === undefined) return ""
        if (typeof val === "object") return JSON.stringify(val)
        return String(val)
      }),
    ]

    const csv = stringify([headers, row])

    await createAuditLog({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: "exported",
      resourceType: "response",
      resourceId: response.id,
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="response-${response.id}.csv"`,
      },
    })
  } catch (error) {
    console.error("Failed to export response:", error)
    return NextResponse.json(
      { error: "Failed to export response" },
      { status: 500 }
    )
  }
}
