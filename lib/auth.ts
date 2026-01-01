import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type AccountsDoc = {
  userId: ObjectId;
  provider: string;
  providerAccountId: string; // <- Discord numeric id as string
  access_token?: string;
};

function toObjectId(value: string): ObjectId | null {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

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
      const client = await clientPromise;
      const db = client.db();

      const adapterUserId = typeof user.id === "string" ? user.id : "";
      const adapterObjectId = toObjectId(adapterUserId);

      let discordId: string | null = null;
      let accessToken: string | null = null;

      if (adapterObjectId) {
        const account = await db.collection<AccountsDoc>("accounts").findOne({
          userId: adapterObjectId,
          provider: "discord",
        });

        if (account?.providerAccountId) {
          discordId = account.providerAccountId;
        }
        if (account?.access_token) {
          accessToken = account.access_token;
        }
      }

      // Ensure session.user exists
      if (session.user) {
        // CRITICAL: Set this to Discord numeric id (matches journalentries.userId)
        session.user.id = discordId ?? adapterUserId;
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