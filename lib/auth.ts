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
      if (session.user) {
        session.user.id = user.id;
      }

      // Fetch access token from MongoDB accounts table
      const client = await clientPromise;
      const db = client.db();
      const account = await db.collection("accounts").findOne({
        userId: user.id,
        provider: "discord",
      });

      if (account?.access_token) {
        session.accessToken = account.access_token as string;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
});
