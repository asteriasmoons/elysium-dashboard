import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
    accessToken?: string
    discordId?: string  // ← ADD THIS
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    discordId?: string
  }
}
