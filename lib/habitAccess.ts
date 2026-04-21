import clientPromise from "@/lib/mongodb";
import type { Document } from "mongodb";

export const HABIT_COLLECTION = "habits";

export type HabitFrequency = "daily" | "weekly";

export interface HabitScheduleInput {
  frequency?: HabitFrequency;
  dayOfWeek?: number | null;
}

export interface HabitDoc extends Document {
  _id: string;
  userId: string;
  name: string;
  description: string;
  hour: number;
  minute: number;
  timezone: string;
  frequency: HabitFrequency;
  dayOfWeek?: number | null;
  createdAt: Date;
  __v?: number;
}

function requireUserId(userId: string | null | undefined): string {
  const trimmed = (userId ?? "").trim();
  if (!trimmed) throw new Error("Missing userId");
  return trimmed;
}

function requireHabitId(habitId: string | null | undefined): string {
  const trimmed = String(habitId ?? "").trim();
  if (!trimmed) throw new Error("Missing habitId");
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
  name: string,
  description: string,
  hour: number,
  minute: number,
  timezone: string,
  schedule: HabitScheduleInput | undefined,
): Promise<string> {
  const uid = requireUserId(userId);
  const trimmedName = String(name ?? "").trim();

  if (!trimmedName) {
    throw new Error("Habit name is required");
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be between 0 and 23");
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Minute must be between 0 and 59");
  }

  const safeTimezone = String(timezone ?? "").trim();
  if (!safeTimezone) {
    throw new Error("Time zone is required");
  }

  const normalizedSchedule = normalizeHabitSchedule(schedule);
  const client = await clientPromise;
  const db = client.db();

  const habitId = `${uid}-${Date.now()}`;

  await db.collection<HabitDoc>(HABIT_COLLECTION).insertOne({
    _id: habitId,
    userId: uid,
    name: trimmedName,
    description: String(description ?? "").trim(),
    hour,
    minute,
    timezone: safeTimezone,
    frequency: normalizedSchedule.frequency,
    ...(normalizedSchedule.dayOfWeek != null
      ? { dayOfWeek: normalizedSchedule.dayOfWeek }
      : {}),
    createdAt: new Date(),
  });

  return habitId;
}

export async function deleteHabit(
  userId: string,
  habitId: string,
): Promise<boolean> {
  const uid = requireUserId(userId);
  const hid = requireHabitId(habitId);

  const client = await clientPromise;
  const db = client.db();

  const result = await db
    .collection<HabitDoc>(HABIT_COLLECTION)
    .deleteOne({ _id: hid, userId: uid });

  return result.deletedCount > 0;
}

export async function getHabitById(
  userId: string,
  habitId: string,
): Promise<HabitDoc | null> {
  const uid = requireUserId(userId);
  const hid = requireHabitId(habitId);

  const client = await clientPromise;
  const db = client.db();

  return db.collection<HabitDoc>(HABIT_COLLECTION).findOne({
    _id: hid,
    userId: uid,
  });
}

export async function updateHabit(
  userId: string,
  habitId: string,
  name: string,
  description: string,
  hour: number,
  minute: number,
  timezone: string,
  schedule: HabitScheduleInput | undefined,
): Promise<boolean> {
  const uid = requireUserId(userId);
  const hid = requireHabitId(habitId);
  const trimmedName = String(name ?? "").trim();

  if (!trimmedName) {
    throw new Error("Habit name is required");
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be between 0 and 23");
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Minute must be between 0 and 59");
  }

  const safeTimezone = String(timezone ?? "").trim();
  if (!safeTimezone) {
    throw new Error("Time zone is required");
  }

  const normalizedSchedule = normalizeHabitSchedule(schedule);
  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection<HabitDoc>(HABIT_COLLECTION).updateOne(
    { _id: hid, userId: uid },
    {
      $set: {
        name: trimmedName,
        description: String(description ?? "").trim(),
        hour,
        minute,
        timezone: safeTimezone,
        frequency: normalizedSchedule.frequency,
        dayOfWeek: normalizedSchedule.dayOfWeek ?? null,
      },
    },
  );

  return result.matchedCount > 0;
}