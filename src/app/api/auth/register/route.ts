import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { registerSchema } from "@/lib/validations"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"
import slugify from "slugify"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    const slug = slugify(data.workspaceName, { lower: true, strict: true })
    let uniqueSlug = slug
    let counter = 1
    while (await prisma.workspace.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`
      counter++
    }

    const { user, workspace } = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.workspaceName,
          slug: uniqueSlug,
        },
      })

      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          role: "OWNER",
          workspaceId: workspace.id,
        },
      })

      return { user, workspace }
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      workspaceId: workspace.id,
    })
  } catch (error) {
    console.error("Registration error:", error)

    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        )
      }
      if (error.code === "P2021") {
        return NextResponse.json(
          { error: "Database tables are not set up. Please run database migrations." },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: `Database error: ${error.code}` },
        { status: 500 }
      )
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: "Database is not configured. Please set DATABASE_URL in your environment variables." },
        { status: 503 }
      )
    }

    const message = error instanceof Error ? error.message : ""
    if (message.includes("Can't reach database") || message.includes("connect")) {
      return NextResponse.json(
        { error: "Database is not configured. Please set DATABASE_URL in your environment variables." },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: `Registration failed: ${message || "Unknown error"}` },
      { status: 500 }
    )
  }
}
