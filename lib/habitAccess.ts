import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const HABIT_COLLECTION = "habits";

export type HabitFrequency = "daily" | "weekly";

export interface HabitScheduleInput {
  frequency?: HabitFrequency;
  dayOfWeek?: number | null;
}

export interface HabitDoc extends Document {
  _id: ObjectId;
  userId: string;
  title: string;
  description: string;
  hour: number;
  minute: number;
  zone: string;
  frequency: HabitFrequency;
  dayOfWeek: number | null;
  streak: number;
  lastCompletedAt: Date | null;
  createdAt: Date;
}

function requireUserId(userId: string | null | undefined): string {
  const trimmed = (userId ?? "").trim();
  if (!trimmed) throw new Error("Missing userId");
  return trimmed;
}

function normalizeHabitSchedule(input?: HabitScheduleInput) {
  const frequency = input?.frequency ?? "daily";

  if (!["daily", "weekly"].includes(frequency)) {
    throw new Error("Frequency must be daily or weekly");
  }

  let dayOfWeek: number | null = input?.dayOfWeek ?? null;

  if (frequency === "weekly") {
    if (
      dayOfWeek == null ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6
    ) {
      throw new Error("Weekly habits require dayOfWeek between 0 and 6");
    }
  } else {
    dayOfWeek = null;
  }

  return {
    frequency,
    dayOfWeek,
  };
}

export async function listUserHabits(userId: string): Promise<HabitDoc[]> {
  const uid = requireUserId(userId);
  const client = await clientPromise;
  const db = client.db();

  return db
    .collection<HabitDoc>(HABIT_COLLECTION)
    .find({ userId: uid })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function createHabit(
  userId: string,
  title: string,
  description: string,
  hour: number,
  minute: number,
  zone: string,
  schedule: HabitScheduleInput | undefined,
): Promise<string> {
  const uid = requireUserId(userId);
  const trimmedTitle = String(title ?? "").trim();

  if (!trimmedTitle) throw new Error("Habit title is required");

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be between 0 and 23");
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Minute must be between 0 and 59");
  }

  const safeZone = String(zone ?? "").trim();
  if (!safeZone) throw new Error("Time zone is required");

  const normalizedSchedule = normalizeHabitSchedule(schedule);

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(HABIT_COLLECTION).insertOne({
    userId: uid,
    title: trimmedTitle,
    description: String(description ?? "").trim(),
    hour,
    minute,
    zone: safeZone,
    frequency: normalizedSchedule.frequency,
    dayOfWeek: normalizedSchedule.dayOfWeek,
    streak: 0,
    lastCompletedAt: null,
    createdAt: new Date(),
  });

  return result.insertedId.toString();
}

export async function deleteHabit(
  userId: string,
  habitId: string,
): Promise<boolean> {
  const uid = requireUserId(userId);

  if (!ObjectId.isValid(habitId)) return false;

  const client = await clientPromise;
  const db = client.db();

  const result = await db
    .collection(HABIT_COLLECTION)
    .deleteOne({ _id: new ObjectId(habitId), userId: uid });

  return result.deletedCount > 0;
}

export async function getHabitById(
  userId: string,
  habitId: string,
): Promise<HabitDoc | null> {
  const uid = requireUserId(userId);

  if (!ObjectId.isValid(habitId)) return null;

  const client = await clientPromise;
  const db = client.db();

  return db
    .collection<HabitDoc>(HABIT_COLLECTION)
    .findOne({ _id: new ObjectId(habitId), userId: uid });
}

export async function updateHabit(
  userId: string,
  habitId: string,
  title: string,
  description: string,
  hour: number,
  minute: number,
  zone: string,
  schedule: HabitScheduleInput | undefined,
): Promise<boolean> {
  const uid = requireUserId(userId);

  if (!ObjectId.isValid(habitId)) return false;

  const trimmedTitle = String(title ?? "").trim();
  if (!trimmedTitle) throw new Error("Habit title is required");

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be between 0 and 23");
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Minute must be between 0 and 59");
  }

  const safeZone = String(zone ?? "").trim();
  if (!safeZone) throw new Error("Time zone is required");

  const normalizedSchedule = normalizeHabitSchedule(schedule);

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(HABIT_COLLECTION).updateOne(
    { _id: new ObjectId(habitId), userId: uid },
    {
      $set: {
        title: trimmedTitle,
        description: String(description ?? "").trim(),
        hour,
        minute,
        zone: safeZone,
        frequency: normalizedSchedule.frequency,
        dayOfWeek: normalizedSchedule.dayOfWeek,
      },
    },
  );

  return result.matchedCount > 0;
}
