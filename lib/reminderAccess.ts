import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const REMINDER_COLLECTION = "reminders";

export interface ReminderDoc extends Document {
  _id: ObjectId;
  userId: string;
  title: string;
  description?: string;
  time: Date;
  completed: boolean;
  createdAt: Date;
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
    .sort({ time: 1 })
    .toArray();
}

export async function createReminder(
  userId: string,
  title: string,
  time: Date,
  description?: string,
): Promise<string> {
  const uid = requireUserId(userId);

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(REMINDER_COLLECTION).insertOne({
    userId: uid,
    title,
    description: description ?? "",
    time,
    completed: false,
    createdAt: new Date(),
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
