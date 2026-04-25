import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const ROLE_PANEL_COLLECTION = "rolepanels";

export type RolePanelType = "select" | "buttons";
export type RolePanelSelectMode = "single" | "multiple";

export type RolePanelRole = {
  _id?: ObjectId;
  roleId: string;
  label: string;
  emoji: string | null;
  description: string | null;
  order: number;
};

export interface RolePanelDoc extends Document {
  _id: ObjectId;
  guildId: string;
  panelName: string;
  type: RolePanelType;
  selectMode: RolePanelSelectMode;
  roles: RolePanelRole[];
  channelId?: string | null;
  messageId?: string | null;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  __v?: number;
}

export type RolePanelInput = {
  guildId: string;
  panelName: string;
  type: RolePanelType;
  selectMode: RolePanelSelectMode;
  roles: RolePanelRole[];
  channelId?: string | null;
  messageId?: string | null;
  embedTitle?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
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

function normalizePanelType(value: unknown): RolePanelType {
  return value === "buttons" ? "buttons" : "select";
}

function normalizeSelectMode(value: unknown): RolePanelSelectMode {
  return value === "multiple" ? "multiple" : "single";
}

function normalizeRoles(roles: RolePanelRole[] | undefined): RolePanelRole[] {
  return Array.isArray(roles)
    ? roles
        .map((role, index) => ({
          roleId: requireValue(role.roleId, "roleId"),
          label: requireValue(role.label, "label"),
          emoji: normalizeOptional(role.emoji),
          description: normalizeOptional(role.description),
          order: Number.isInteger(role.order) ? role.order : index,
        }))
        .sort((a, b) => a.order - b.order)
    : [];
}

export async function listGuildRolePanels(
  guildId: string,
): Promise<RolePanelDoc[]> {
  const gid = requireValue(guildId, "guildId");
  const client = await clientPromise;
  const db = client.db();

  return db
    .collection<RolePanelDoc>(ROLE_PANEL_COLLECTION)
    .find({ guildId: gid })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();
}

export async function getRolePanelById(
  guildId: string,
  panelId: string,
): Promise<RolePanelDoc | null> {
  const gid = requireValue(guildId, "guildId");

  if (!ObjectId.isValid(panelId)) return null;

  const client = await clientPromise;
  const db = client.db();

  return db.collection<RolePanelDoc>(ROLE_PANEL_COLLECTION).findOne({
    _id: new ObjectId(panelId),
    guildId: gid,
  });
}

export async function createRolePanel(input: RolePanelInput): Promise<string> {
  const guildId = requireValue(input.guildId, "guildId");
  const panelName = requireValue(input.panelName, "panelName");
  const now = new Date();

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(ROLE_PANEL_COLLECTION).insertOne({
    guildId,
    panelName,
    type: normalizePanelType(input.type),
    selectMode: normalizeSelectMode(input.selectMode),
    roles: normalizeRoles(input.roles),
    channelId: normalizeOptional(input.channelId),
    messageId: normalizeOptional(input.messageId),
    embedTitle: normalizeOptional(input.embedTitle),
    embedDescription: normalizeOptional(input.embedDescription),
    embedColor: normalizeOptional(input.embedColor) ?? "#00bfff",
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

export async function updateRolePanel(
  guildId: string,
  panelId: string,
  input: Omit<RolePanelInput, "guildId">,
): Promise<boolean> {
  const gid = requireValue(guildId, "guildId");

  if (!ObjectId.isValid(panelId)) return false;

  const panelName = requireValue(input.panelName, "panelName");

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(ROLE_PANEL_COLLECTION).updateOne(
    {
      _id: new ObjectId(panelId),
      guildId: gid,
    },
    {
      $set: {
        panelName,
        type: normalizePanelType(input.type),
        selectMode: normalizeSelectMode(input.selectMode),
        roles: normalizeRoles(input.roles),
        channelId: normalizeOptional(input.channelId),
        messageId: normalizeOptional(input.messageId),
        embedTitle: normalizeOptional(input.embedTitle),
        embedDescription: normalizeOptional(input.embedDescription),
        embedColor: normalizeOptional(input.embedColor) ?? "#00bfff",
        updatedAt: new Date(),
      },
    },
  );

  return result.matchedCount > 0;
}

export async function deleteRolePanel(
  guildId: string,
  panelId: string,
): Promise<boolean> {
  const gid = requireValue(guildId, "guildId");

  if (!ObjectId.isValid(panelId)) return false;

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(ROLE_PANEL_COLLECTION).deleteOne({
    _id: new ObjectId(panelId),
    guildId: gid,
  });

  return result.deletedCount > 0;
}
