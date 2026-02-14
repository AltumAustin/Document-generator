import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      role: string
      workspaceId: string | null
    }
  }

  interface User {
    role: string
    workspaceId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    workspaceId: string | null
  }
}
