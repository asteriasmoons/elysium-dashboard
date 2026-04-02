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

      if (account?.providerAccountId) {
        token.discordId = account.providerAccountId
      } else if (typeof profile?.id === "string") {
        token.discordId = profile.id
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
