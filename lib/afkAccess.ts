import clientPromise from "@/lib/mongodb";

export const AFK_CONFIG_COLLECTION = "afkconfigs";

export interface AfkConfigDoc {
  guildId: string;
  enabled: boolean;
  noticeTitle: string;
  noticeColor: string;
  defaultMessage: string;
}

export async function getAfkConfig(guildId: string): Promise<AfkConfigDoc> {
  const client = await clientPromise;
  const db = client.db();

  const existing = await db
    .collection<AfkConfigDoc>(AFK_CONFIG_COLLECTION)
    .findOne({ guildId });

  if (existing) return existing;

  return {
    guildId,
    enabled: true,
    noticeTitle: "AFK Notice",
    noticeColor: "#58b2f2",
    defaultMessage: "I am currently AFK.",
  };
}

export async function updateAfkConfig(
  guildId: string,
  data: Partial<AfkConfigDoc>,
): Promise<AfkConfigDoc> {
  const client = await clientPromise;
  const db = client.db();

  await db.collection<AfkConfigDoc>(AFK_CONFIG_COLLECTION).updateOne(
    { guildId },
    {
      $set: {
        ...data,
        guildId,
      },
    },
    { upsert: true },
  );

  return getAfkConfig(guildId);
}
