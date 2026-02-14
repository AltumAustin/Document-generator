import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { registerSchema } from "@/lib/validations"
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

    const workspace = await prisma.workspace.create({
      data: {
        name: data.workspaceName,
        slug: uniqueSlug,
      },
    })

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "OWNER",
        workspaceId: workspace.id,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      workspaceId: workspace.id,
    })
  } catch (error) {
    console.error("Registration error:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
