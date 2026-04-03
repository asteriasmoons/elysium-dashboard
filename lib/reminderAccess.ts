import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const REMINDER_COLLECTION = "reminders";

export interface ReminderDoc extends Document {
  _id: ObjectId;
  userId: string;
  guildId: string | null;
  hour: number;
  minute: number;
  text: string;
  zone: string;
  reminderSentAt: Date | null;
  completed?: boolean;
}

function requireUserId(userId: string | null | undefined): string {
  const trimmed = (userId ?? "").trim();
  if (!trimmed) throw new Error("Missing userId");
  return trimmed;
}

export async function listUserReminders(
  userId: string,
): Promise<ReminderDoc[]> {
  const uid = requireUserId(userId);
  const client = await clientPromise;
  const db = client.db();

  return db
    .collection<ReminderDoc>(REMINDER_COLLECTION)
    .find({ userId: uid })
    .sort({ hour: 1, minute: 1 })
    .toArray();
}

export async function createReminder(
  userId: string,
  text: string,
  hour: number,
  minute: number,
  zone: string,
  guildId: string | null,
  reminderSentAt: Date | null,
): Promise<string> {
  const uid = requireUserId(userId);
  const trimmedText = String(text ?? "").trim();

  if (!trimmedText) {
    throw new Error("Reminder text is required");
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be between 0 and 23");
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Minute must be between 0 and 59");
  }

  const safeZone = String(zone ?? "").trim();
  if (!safeZone) {
    throw new Error("Time zone is required");
  }

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(REMINDER_COLLECTION).insertOne({
    userId: uid,
    guildId: guildId ?? null,
    hour,
    minute,
    text: trimmedText,
    zone: safeZone,
    reminderSentAt: reminderSentAt ?? null,
    completed: false,
  });

  return result.insertedId.toString();
}

export async function toggleReminder(
  userId: string,
  reminderId: string,
): Promise<boolean> {
  const uid = requireUserId(userId);

  if (!ObjectId.isValid(reminderId)) return false;

  const client = await clientPromise;
  const db = client.db();

  const _id = new ObjectId(reminderId);

  const reminder = await db
    .collection<ReminderDoc>(REMINDER_COLLECTION)
    .findOne({ _id, userId: uid });

  if (!reminder) return false;

  const result = await db
    .collection(REMINDER_COLLECTION)
    .updateOne(
      { _id, userId: uid },
      { $set: { completed: !reminder.completed } },
    );

  return result.modifiedCount > 0;
}

export async function deleteReminder(
  userId: string,
  reminderId: string,
): Promise<boolean> {
  const uid = requireUserId(userId);

  if (!ObjectId.isValid(reminderId)) return false;

  const client = await clientPromise;
  const db = client.db();

  const _id = new ObjectId(reminderId);

  const result = await db
    .collection(REMINDER_COLLECTION)
    .deleteOne({ _id, userId: uid });

  return result.deletedCount > 0;
}

export async function getReminderById(
  userId: string,
  reminderId: string,
): Promise<ReminderDoc | null> {
  const uid = requireUserId(userId);

  if (!ObjectId.isValid(reminderId)) return null;

  const client = await clientPromise;
  const db = client.db();
  const _id = new ObjectId(reminderId);

  return db
    .collection<ReminderDoc>(REMINDER_COLLECTION)
    .findOne({ _id, userId: uid });
}

export async function updateReminder(
  userId: string,
  reminderId: string,
  text: string,
  hour: number,
  minute: number,
  zone: string,
  guildId: string | null,
  reminderSentAt: Date | null,
): Promise<boolean> {
  const uid = requireUserId(userId);
  const trimmedText = String(text ?? "").trim();

  if (!ObjectId.isValid(reminderId)) return false;
  if (!trimmedText) {
    throw new Error("Reminder text is required");
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be between 0 and 23");
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Minute must be between 0 and 59");
  }

  const safeZone = String(zone ?? "").trim();
  if (!safeZone) {
    throw new Error("Time zone is required");
  }

  const client = await clientPromise;
  const db = client.db();
  const _id = new ObjectId(reminderId);

  const result = await db.collection(REMINDER_COLLECTION).updateOne(
    { _id, userId: uid },
    {
      $set: {
        text: trimmedText,
        hour,
        minute,
        zone: safeZone,
        guildId: guildId ?? null,
        reminderSentAt: reminderSentAt ?? null,
      },
    },
  );

  return result.modifiedCount > 0;
}