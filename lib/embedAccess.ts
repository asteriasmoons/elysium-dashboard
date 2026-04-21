import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const EMBED_COLLECTION = "embeds";

export interface EmbedDoc extends Document {
  _id: ObjectId;
  guildId: string;
  name: string;
  creatorId: string;
  title: string | null;
  description: string | null;
  color: string | null;
  author: {
    name: string;
    icon_url: string;
  };
  footer: {
    text: string;
    icon_url: string;
    timestamp: boolean;
  };
  thumbnail: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export interface EmbedInput {
  guildId: string;
  name: string;
  creatorId: string;
  title?: string | null;
  description?: string | null;
  color?: string | null;
  author?: {
    name?: string;
    icon_url?: string;
  } | null;
  footer?: {
    text?: string;
    icon_url?: string;
    timestamp?: boolean;
  } | null;
  thumbnail?: string | null;
  image?: string | null;
}

function requireString(
  value: string | null | undefined,
  field: string,
): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new Error(`Missing ${field}`);
  }
  return trimmed;
}

function normalizeOptionalString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeColor(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function normalizeEmbedInput(input: EmbedInput) {
  const guildId = requireString(input.guildId, "guildId");
  const name = requireString(input.name, "name");
  const creatorId = requireString(input.creatorId, "creatorId");

  return {
    guildId,
    name,
    creatorId,
    title: normalizeOptionalString(input.title) || null,
    description: normalizeOptionalString(input.description) || null,
    color: normalizeColor(input.color),
    author: {
      name: normalizeOptionalString(input.author?.name),
      icon_url: normalizeOptionalString(input.author?.icon_url),
    },
    footer: {
      text: normalizeOptionalString(input.footer?.text),
      icon_url: normalizeOptionalString(input.footer?.icon_url),
      timestamp: Boolean(input.footer?.timestamp),
    },
    thumbnail: normalizeOptionalString(input.thumbnail),
    image: normalizeOptionalString(input.image),
  };
}

export async function listGuildEmbeds(guildId: string): Promise<EmbedDoc[]> {
  const gid = requireString(guildId, "guildId");
  const client = await clientPromise;
  const db = client.db();

  return db
    .collection<EmbedDoc>(EMBED_COLLECTION)
    .find({ guildId: gid })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();
}

export async function createEmbed(input: EmbedInput): Promise<string> {
  const normalized = normalizeEmbedInput(input);
  const client = await clientPromise;
  const db = client.db();
  const now = new Date();

  const result = await db.collection<EmbedDoc>(EMBED_COLLECTION).insertOne({
    guildId: normalized.guildId,
    name: normalized.name,
    creatorId: normalized.creatorId,
    title: normalized.title,
    description: normalized.description,
    color: normalized.color,
    author: normalized.author,
    footer: normalized.footer,
    thumbnail: normalized.thumbnail,
    image: normalized.image,
    createdAt: now,
    updatedAt: now,
  } as EmbedDoc);

  return result.insertedId.toString();
}

export async function getEmbedById(
  guildId: string,
  embedId: string,
): Promise<EmbedDoc | null> {
  const gid = requireString(guildId, "guildId");

  if (!ObjectId.isValid(embedId)) {
    return null;
  }

  const client = await clientPromise;
  const db = client.db();

  return db.collection<EmbedDoc>(EMBED_COLLECTION).findOne({
    _id: new ObjectId(embedId),
    guildId: gid,
  });
}

export async function updateEmbed(
  guildId: string,
  embedId: string,
  input: Omit<EmbedInput, "guildId" | "creatorId">,
): Promise<boolean> {
  const gid = requireString(guildId, "guildId");

  if (!ObjectId.isValid(embedId)) {
    return false;
  }

  const name = requireString(input.name, "name");
  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection<EmbedDoc>(EMBED_COLLECTION).updateOne(
    { _id: new ObjectId(embedId), guildId: gid },
    {
      $set: {
        name,
        title: normalizeOptionalString(input.title) || null,
        description: normalizeOptionalString(input.description) || null,
        color: normalizeColor(input.color),
        author: {
          name: normalizeOptionalString(input.author?.name),
          icon_url: normalizeOptionalString(input.author?.icon_url),
        },
        footer: {
          text: normalizeOptionalString(input.footer?.text),
          icon_url: normalizeOptionalString(input.footer?.icon_url),
          timestamp: Boolean(input.footer?.timestamp),
        },
        thumbnail: normalizeOptionalString(input.thumbnail),
        image: normalizeOptionalString(input.image),
        updatedAt: new Date(),
      },
    },
  );

  return result.matchedCount > 0;
}

export async function deleteEmbed(
  guildId: string,
  embedId: string,
): Promise<boolean> {
  const gid = requireString(guildId, "guildId");

  if (!ObjectId.isValid(embedId)) {
    return false;
  }

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection<EmbedDoc>(EMBED_COLLECTION).deleteOne({
    _id: new ObjectId(embedId),
    guildId: gid,
  });

  return result.deletedCount > 0;
}
