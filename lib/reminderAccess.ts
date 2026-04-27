import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const REMINDER_COLLECTION = "reminders";

export type ReminderType = "guild" | "dm";

export interface ReminderDoc extends Document {
  _id: ObjectId;
  type: ReminderType;
  guildId: string | null;
  userId: string | null;
  name: string;
  creatorId: string;
  interval: string;
  startDate: Date;
  ping: string;
  channelId: string | null;
  dayOfWeek: string | null;
  embedTitle: string;
  embedDescription: string;
  embedColor: string;
  timezone: string;
  lastSent: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReminderInput {
  type: ReminderType;
  name: string;
  creatorId: string;
  interval: string;
  startDate: Date | string;
  ping?: string;
  channelId?: string | null;
  dayOfWeek?: string | null;
  embedTitle?: string;
  embedDescription?: string;
  embedColor?: string;
  timezone?: string;
  lastSent?: Date | string | null;
}

function requireObjectId(id: string | null | undefined): ObjectId {
  const trimmed = String(id ?? "").trim();
  if (!ObjectId.isValid(trimmed)) throw new Error("Invalid id");
  return new ObjectId(trimmed);
}

function normalizeString(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function normalizeDate(value: Date | string | null | undefined, fallback?: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (fallback) return fallback;
  throw new Error("Invalid date");
}

function normalizeNullableDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  return normalizeDate(value);
}

function normalizeReminderInput(input: ReminderInput) {
  const type: ReminderType = input.type === "dm" ? "dm" : "guild";
  const name = normalizeString(input.name);
  const creatorId = normalizeString(input.creatorId);
  const interval = normalizeString(input.interval);
  const timezone = normalizeString(input.timezone, "America/Chicago") || "America/Chicago";

  if (!name) throw new Error("Reminder name is required");
  if (!creatorId) throw new Error("Reminder creatorId is required");
  if (!interval) throw new Error("Reminder interval is required");

  return {
    type,
    name,
    creatorId,
    interval,
    startDate: normalizeDate(input.startDate),
    ping: type === "guild" ? normalizeString(input.ping) : "",
    channelId: type === "guild" ? (normalizeString(input.channelId) || null) : null,
    dayOfWeek: input.dayOfWeek ? normalizeString(input.dayOfWeek) : null,
    embedTitle: normalizeString(input.embedTitle, "Reminder!") || "Reminder!",
    embedDescription: normalizeString(input.embedDescription),
    embedColor: normalizeString(input.embedColor, "#8757f2") || "#8757f2",
    timezone,
    lastSent: normalizeNullableDate(input.lastSent),
  };
}

export async function listUserReminders(userId: string): Promise<ReminderDoc[]> {
  const client = await clientPromise;
  const db = client.db();
  return db
    .collection<ReminderDoc>(REMINDER_COLLECTION)
    .find({ type: "dm", userId })
    .sort({ name: 1 })
    .toArray();
}

export async function listGuildReminders(guildId: string): Promise<ReminderDoc[]> {
  const client = await clientPromise;
  const db = client.db();
  return db
    .collection<ReminderDoc>(REMINDER_COLLECTION)
    .find({ type: "guild", guildId })
    .sort({ name: 1 })
    .toArray();
}

export async function getReminderById(
  userId: string,
  reminderId: string,
): Promise<ReminderDoc | null> {
  const _id = requireObjectId(reminderId);
  const client = await clientPromise;
  const db = client.db();
  // Allow access if userId matches either userId (DM) or creatorId (guild)
  return db.collection<ReminderDoc>(REMINDER_COLLECTION).findOne({
    _id,
    $or: [{ userId }, { creatorId: userId }],
  });
}

export async function createReminder(
  userId: string,
  input: ReminderInput,
): Promise<string> {
  const client = await clientPromise;
  const db = client.db();
  const normalized = normalizeReminderInput(input);
  const now = new Date();

  const doc = {
    _id: new ObjectId(),
    ...normalized,
    userId: normalized.type === "dm" ? userId : null,
    guildId: normalized.type === "guild" ? (input as { guildId?: string }).guildId ?? null : null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<ReminderDoc>(REMINDER_COLLECTION).insertOne(doc);
  return result.insertedId.toString();
}

export async function updateReminder(
  userId: string,
  reminderId: string,
  input: Partial<ReminderInput>,
): Promise<boolean> {
  const _id = requireObjectId(reminderId);
  const client = await clientPromise;
  const db = client.db();

  const setFields: Record<string, unknown> = { updatedAt: new Date() };
  if (input.interval !== undefined) setFields.interval = normalizeString(input.interval);
  if (input.startDate !== undefined) setFields.startDate = normalizeDate(input.startDate);
  if (input.dayOfWeek !== undefined) setFields.dayOfWeek = input.dayOfWeek ? normalizeString(input.dayOfWeek) : null;
  if (input.embedTitle !== undefined) setFields.embedTitle = normalizeString(input.embedTitle, "Reminder!") || "Reminder!";
  if (input.embedDescription !== undefined) setFields.embedDescription = normalizeString(input.embedDescription);
  if (input.embedColor !== undefined) setFields.embedColor = normalizeString(input.embedColor, "#8757f2") || "#8757f2";
  if (input.timezone !== undefined) setFields.timezone = normalizeString(input.timezone, "America/Chicago") || "America/Chicago";
  if (input.ping !== undefined) setFields.ping = normalizeString(input.ping);
  if (input.channelId !== undefined) setFields.channelId = input.channelId ?? null;

  const result = await db.collection<ReminderDoc>(REMINDER_COLLECTION).updateOne(
    { _id, $or: [{ userId }, { creatorId: userId }] },
    { $set: setFields },
  );

  return result.matchedCount > 0;
}

export async function deleteReminder(
  userId: string,
  reminderId: string,
): Promise<boolean> {
  const _id = requireObjectId(reminderId);
  const client = await clientPromise;
  const db = client.db();

  const result = await db
    .collection<ReminderDoc>(REMINDER_COLLECTION)
    .deleteOne({ _id, $or: [{ userId }, { creatorId: userId }] });

  return result.deletedCount > 0;
}
