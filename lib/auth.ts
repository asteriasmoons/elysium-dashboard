import NextAuth from "next-auth"
import Discord from "next-auth/providers/discord"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify guilds",
          prompt: "consent"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }

      // Set discordId when account info is available (first sign-in)
      if (account?.providerAccountId) {
        token.discordId = account.providerAccountId
      } else if (typeof profile?.id === "string") {
        token.discordId = profile.id
      }

      // If discordId is still missing (existing JWT without it), look it up from DB
      if (!token.discordId && token.sub) {
        try {
          const client = await clientPromise
          const db = client.db()
          const linked = await db.collection("accounts").findOne({
            userId: token.sub,
            provider: "discord",
          })
          if (linked?.providerAccountId) {
            token.discordId = linked.providerAccountId as string
          }
        } catch {
          // non-fatal, proceed without discordId
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        session.user.id = token.sub
      }

      if (typeof token.accessToken === "string") {
        session.accessToken = token.accessToken
      }

      if (typeof token.discordId === "string") {
        session.discordId = token.discordId
      }

      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },
  trustHost: true,
})
