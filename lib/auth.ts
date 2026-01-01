import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "database",
  },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify guilds",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Persist discord id on session.user.id
      if (session.user) {
        session.user.id = user.id;
      }

      // Pull access_token from DB adapter's Account record
      const client = await clientPromise;
      const db = client.db();

      const account = await db.collection("accounts").findOne({
        userId: user.id,
        provider: "discord",
      });

      if (account && typeof account.access_token === "string") {
        session.accessToken = account.access_token;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
});