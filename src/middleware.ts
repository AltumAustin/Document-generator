import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Public routes
        if (
          path === "/" ||
          path.startsWith("/login") ||
          path.startsWith("/register") ||
          path.startsWith("/q/") ||
          path.startsWith("/sign/") ||
          path.startsWith("/api/auth") ||
          path.startsWith("/api/v1/") ||
          path.startsWith("/api/shared/") ||
          path.startsWith("/api/signatures/") ||
          path.startsWith("/api/health") ||
          path.startsWith("/api/responses") // Public form submissions
        ) {
          return true
        }

        // Protected routes require token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
