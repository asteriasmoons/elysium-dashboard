import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type AccountDoc = {
  userId: ObjectId;
  provider: string;
  providerAccountId: string;
  access_token?: string;
};

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
      // user.id here is the Adapter user id (Mongo), not Discord.
      // We must look up the Discord account to get providerAccountId (Discord numeric id).
      const client = await clientPromise;
      const db = client.db();

      let discordId: string | null = null;
      let accessToken: string | null = null;

      // user.id is a string, but accounts.userId is an ObjectId
      const adapterUserObjectId = new ObjectId(user.id);

      const account = await db.collection<AccountDoc>("accounts").findOne({
        userId: adapterUserObjectId,
        provider: "discord",
      });

      if (account && typeof account.providerAccountId === "string") {
        discordId = account.providerAccountId;
      }

      if (account && typeof account.access_token === "string") {
        accessToken = account.access_token;
      }

      // Ensure session.user exists
      if (session.user) {
        // This is the critical change:
        // Make session.user.id be the Discord numeric id so your journal queries match the bot.
        if (discordId) {
          session.user.id = discordId;
        } else {
          // Fallback: keep adapter id if discordId isn't found (shouldn't happen, but safe)
          session.user.id = user.id;
        }
      }

      if (accessToken) {
        session.accessToken = accessToken;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
});