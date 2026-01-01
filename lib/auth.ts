import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
      if (!session.user) return session;

      const client = await clientPromise;
      const db = client.db();

      type AccountDoc = {
        userId: ObjectId;
        provider: string;
        providerAccountId?: string;
        access_token?: string;
      };

      const account = await db.collection<AccountDoc>("accounts").findOne({
        userId: new ObjectId(user.id),
        provider: "discord",
      });

      // THIS is the critical fix:
      // use Discord's numeric user ID, not Auth's ObjectId
      if (account?.providerAccountId) {
        session.user.id = account.providerAccountId;
      }

      if (account?.access_token) {
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
