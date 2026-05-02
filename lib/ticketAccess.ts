import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const TICKET_PANEL_COLLECTION = "ticketpanels";

export type ModalField = {
  label: string;
  placeholder: string;
  style: "short" | "paragraph";
  required: boolean;
};

export type TicketEmbedData = {
  title: string | null;
  description: string | null;
  color: string | null;
  author: {
    name: string | null;
    icon_url: string | null;
  };
  footer: {
    text: string | null;
    icon_url: string | null;
    timestamp: boolean;
  };
  thumbnail: string | null;
  image: string | null;
};

export interface TicketPanelDoc extends Document {
  _id: ObjectId;
  guildId: string;
  panelName: string;
  creatorId: string;
  emoji: string | null;
  greeting: string;
  postChannelId: string;
  ticketCategoryId: string;
  transcriptsEnabled: boolean;
  transcriptChannelId?: string | null;
  roleToPing?: string | null;
  embed: TicketEmbedData;
  greetingEmbed?: TicketEmbedData;
  modalFields?: ModalField[];
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export type TicketPanelInput = {
  guildId: string;
  creatorId: string;
  panelName: string;
  emoji?: string | null;
  greeting?: string;
  postChannelId: string;
  ticketCategoryId: string;
  transcriptsEnabled?: boolean;
  transcriptChannelId?: string | null;
  roleToPing?: string | null;
  embed: TicketEmbedData;
  greetingEmbed?: TicketEmbedData;
  modalFields?: ModalField[];
};

function requireValue(value: string | null | undefined, name: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return trimmed;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function normalizeEmbed(
  input: Partial<TicketEmbedData> | undefined,
): TicketEmbedData {
  return {
    title: normalizeOptional(input?.title),
    description: normalizeOptional(input?.description),
    color: normalizeOptional(input?.color) ?? "#5865F2",
    author: {
      name: normalizeOptional(input?.author?.name),
      icon_url: normalizeOptional(input?.author?.icon_url),
    },
    footer: {
      text: normalizeOptional(input?.footer?.text),
      icon_url: normalizeOptional(input?.footer?.icon_url),
      timestamp: Boolean(input?.footer?.timestamp),
    },
    thumbnail: normalizeOptional(input?.thumbnail),
    image: normalizeOptional(input?.image),
  };
}

export async function listGuildTicketPanels(
  guildId: string,
): Promise<TicketPanelDoc[]> {
  const gid = requireValue(guildId, "guildId");
  const client = await clientPromise;
  const db = client.db();

  return db
    .collection<TicketPanelDoc>(TICKET_PANEL_COLLECTION)
    .find({ guildId: gid })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();
}

export async function getTicketPanelById(
  guildId: string,
  panelId: string,
): Promise<TicketPanelDoc | null> {
  const gid = requireValue(guildId, "guildId");

  if (!ObjectId.isValid(panelId)) return null;

  const client = await clientPromise;
  const db = client.db();

  return db.collection<TicketPanelDoc>(TICKET_PANEL_COLLECTION).findOne({
    _id: new ObjectId(panelId),
    guildId: gid,
  });
}

export async function createTicketPanel(
  input: TicketPanelInput,
): Promise<string> {
  const guildId = requireValue(input.guildId, "guildId");
  const creatorId = requireValue(input.creatorId, "creatorId");
  const panelName = requireValue(input.panelName, "panelName");
  const postChannelId = requireValue(input.postChannelId, "postChannelId");
  const ticketCategoryId = requireValue(
    input.ticketCategoryId,
    "ticketCategoryId",
  );

  const now = new Date();
  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(TICKET_PANEL_COLLECTION).insertOne({
    guildId,
    creatorId,
    panelName,
    emoji: normalizeOptional(input.emoji),
    greeting: String(input.greeting ?? "").trim(),
    postChannelId,
    ticketCategoryId,
    transcriptsEnabled: Boolean(input.transcriptsEnabled),
    transcriptChannelId: normalizeOptional(input.transcriptChannelId),
    roleToPing: normalizeOptional(input.roleToPing),
    embed: normalizeEmbed(input.embed),
    greetingEmbed: normalizeEmbed(input.greetingEmbed),
    modalFields: Array.isArray(input.modalFields) ? input.modalFields : [],
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

export async function updateTicketPanel(
  guildId: string,
  panelId: string,
  input: Omit<TicketPanelInput, "guildId" | "creatorId">,
): Promise<boolean> {
  const gid = requireValue(guildId, "guildId");

  if (!ObjectId.isValid(panelId)) return false;

  const panelName = requireValue(input.panelName, "panelName");
  const postChannelId = requireValue(input.postChannelId, "postChannelId");
  const ticketCategoryId = requireValue(
    input.ticketCategoryId,
    "ticketCategoryId",
  );

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(TICKET_PANEL_COLLECTION).updateOne(
    {
      _id: new ObjectId(panelId),
      guildId: gid,
    },
    {
      $set: {
        panelName,
        emoji: normalizeOptional(input.emoji),
        greeting: String(input.greeting ?? "").trim(),
        postChannelId,
        ticketCategoryId,
        transcriptsEnabled: Boolean(input.transcriptsEnabled),
        transcriptChannelId: normalizeOptional(input.transcriptChannelId),
        roleToPing: normalizeOptional(input.roleToPing),
        embed: normalizeEmbed(input.embed),
        greetingEmbed: normalizeEmbed(input.greetingEmbed),
        modalFields: Array.isArray(input.modalFields) ? input.modalFields : [],
        updatedAt: new Date(),
      },
    },
  );

  return result.matchedCount > 0;
}

export async function deleteTicketPanel(
  guildId: string,
  panelId: string,
): Promise<boolean> {
  const gid = requireValue(guildId, "guildId");

  if (!ObjectId.isValid(panelId)) return false;

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(TICKET_PANEL_COLLECTION).deleteOne({
    _id: new ObjectId(panelId),
    guildId: gid,
  });

  return result.deletedCount > 0;
}
