import { NextResponse } from "next/server";
import webpush from "web-push";
import clientPromise from "@/lib/mongodb";

type HabitFrequency = "daily" | "weekly";

type HabitDoc = {
  _id: string;
  userId?: string;
  name?: string;
  description?: string;
  hour?: number;
  minute?: number;
  timezone?: string;
  frequency?: HabitFrequency;
  dayOfWeek?: number | string | null;
  habitReminderSentKey?: string | null;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const WEEKDAY_TO_NUMBER: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const FULL_WEEKDAY_TO_NUMBER: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const TIMEZONE_MAP: Record<string, string> = {
  "Indian Standard Time": "Asia/Kolkata",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles",
};

function configureWebPush() {
  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    throw new Error(
      "Missing VAPID env vars. Required: VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY",
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const rawHour = Number(getPart("hour"));
  const hour = rawHour === 24 ? 0 : rawHour;

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    hour,
    minute: Number(getPart("minute")),
    weekday: WEEKDAY_TO_NUMBER[getPart("weekday")] ?? 0,
  };
}

function normalizeTimezone(timezone: string | undefined) {
  let zone = String(timezone ?? "UTC").trim() || "UTC";

  if (TIMEZONE_MAP[zone]) {
    zone = TIMEZONE_MAP[zone];
  }

  return zone;
}

function normalizeDayOfWeek(dayOfWeek: number | string | null | undefined) {
  if (typeof dayOfWeek === "number") return dayOfWeek;

  if (typeof dayOfWeek === "string") {
    if (FULL_WEEKDAY_TO_NUMBER[dayOfWeek] != null) {
      return FULL_WEEKDAY_TO_NUMBER[dayOfWeek];
    }

    const numeric = Number(dayOfWeek);
    if (Number.isInteger(numeric)) return numeric;
  }

  return null;
}

function isHabitDue(habit: HabitDoc, now: Date) {
  const zone = normalizeTimezone(habit.timezone);
  const hour = Number(habit.hour);
  const minute = Number(habit.minute);

  if (!habit.userId) return null;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  let local: ZonedParts;

  try {
    local = getZonedParts(now, zone);
  } catch {
    console.error("Invalid habit timezone, falling back to UTC:", zone);
    local = getZonedParts(now, "UTC");
  }

  const currentTotalMinutes = local.hour * 60 + local.minute;
  const scheduledTotalMinutes = hour * 60 + minute;
  const minutesAfterScheduled = currentTotalMinutes - scheduledTotalMinutes;

  if (minutesAfterScheduled < 0 || minutesAfterScheduled >= 5) {
    return null;
  }

  const frequency = habit.frequency ?? "daily";

  if (frequency === "weekly") {
    const habitDay = normalizeDayOfWeek(habit.dayOfWeek);

    if (habitDay !== local.weekday) {
      return null;
    }
  }

  const sentKey = `${habit.userId}:${habit._id}:${frequency}:${local.year}-${local.month}-${local.day}:${hour}:${minute}`;

  if (habit.habitReminderSentKey === sentKey) {
    return null;
  }

  return sentKey;
}

async function runHabitPushCron() {
  configureWebPush();

  const client = await clientPromise;
  const db = client.db();
  const now = new Date();

  const habits = await db.collection<HabitDoc>("habits").find({}).toArray();

  let checked = 0;
  let due = 0;
  let sent = 0;
  let failed = 0;

  for (const habit of habits) {
    checked++;

    const sentKey = isHabitDue(habit, now);
    if (!sentKey || !habit.userId) continue;

    due++;

    const subs = await db
      .collection("pushSubscriptions")
      .find({ userId: habit.userId })
      .toArray();

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify({
            title: "Habit Reminder",
            body: habit.name
              ? `Time for: ${habit.name}`
              : "You have a habit due.",
          }),
        );

        sent++;
      } catch (err) {
        failed++;
        console.error("Habit push failed", err);
      }
    }

    await db.collection<HabitDoc>("habits").updateOne(
      { _id: habit._id },
      {
        $set: {
          habitReminderSentAt: now,
          habitReminderSentKey: sentKey,
        },
      },
    );
  }

  return { checked, due, sent, failed };
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.PUSH_CRON_SECRET;

    if (!cronSecret) {
      console.error("Missing PUSH_CRON_SECRET env var");

      return NextResponse.json(
        { success: false, error: "Server is missing PUSH_CRON_SECRET" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await runHabitPushCron();

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Habit push cron failed", err);

    const message = err instanceof Error ? err.message : "Unknown cron error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
