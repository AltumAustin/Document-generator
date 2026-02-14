import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const publicPaths = [
  "/",
  "/login",
  "/register",
]

const publicPrefixes = [
  "/q/",
  "/sign/",
  "/api/",
]

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Allow all public paths
  for (const prefix of publicPrefixes) {
    if (path.startsWith(prefix)) return NextResponse.next()
  }
  for (const p of publicPaths) {
    if (path === p) return NextResponse.next()
  }

  // Protected routes: check for session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
