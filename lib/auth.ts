import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type SessionUser = {
  id?: string; // we will store DISCORD user id here
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

declare module "next-auth" {
  interface Session {
    user?: SessionUser;
    accessToken?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "database" },

  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],

  callbacks: {
    async session({ session, user }) {
      // Safety
      if (!session.user) session.user = {};

      const client = await clientPromise;
      const db = client.db();

      // user.id from the adapter is the Auth "users" _id (ObjectId as string)
      // We need the Discord id, which is stored on the accounts record as providerAccountId.
      let discordId: string | null = null;

      try {
        const account = await db.collection("accounts").findOne({
          userId: new ObjectId(user.id),
          provider: "discord",
        });

        if (account && typeof account.providerAccountId === "string") {
          discordId = account.providerAccountId;
        }

        if (account?.access_token && typeof account.access_token === "string") {
          session.accessToken = account.access_token;
        }
      } catch {
        // If this fails, we leave discordId null and fall back below.
      }

      // IMPORTANT: make session.user.id your DISCORD numeric id
      // so your journal queries match your stored docs.
      session.user.id = discordId ?? session.user.id ?? user.id;

      return session;
    },
  },

  pages: { signIn: "/login" },
  trustHost: true,
});