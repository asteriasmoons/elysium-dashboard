import { NextResponse } from "next/server";
import webpush from "web-push";
import clientPromise from "@/lib/mongodb";

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

type ReminderDoc = {
  _id: unknown;
  userId?: string;
  text?: string;
  hour?: number;
  minute?: number;
  zone?: string;
  frequency?: "daily" | "weekly" | "monthly";
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  reminderSentKey?: string | null;
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

const TIMEZONE_MAP: Record<string, string> = {
  "Indian Standard Time": "Asia/Kolkata",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles",
};

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

function isReminderDue(reminder: ReminderDoc, now: Date) {
  let zone = String(reminder.zone ?? "UTC").trim() || "UTC";

  if (TIMEZONE_MAP[zone]) {
    zone = TIMEZONE_MAP[zone];
  }

  const hour = Number(reminder.hour);
  const minute = Number(reminder.minute);

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  let local: ZonedParts;

  try {
    local = getZonedParts(now, zone);
  } catch (err) {
    console.error("Invalid timezone, falling back to UTC:", zone);
    local = getZonedParts(now, "UTC");
  }

  const currentTotalMinutes = local.hour * 60 + local.minute;
  const scheduledTotalMinutes = hour * 60 + minute;
  const minutesAfterScheduled = currentTotalMinutes - scheduledTotalMinutes;

  // Railway cron minimum is every 5 minutes, so this catches reminders whose
  // exact minute happened within the current cron window.
  if (minutesAfterScheduled < 0 || minutesAfterScheduled >= 5) {
    return null;
  }

  const frequency = reminder.frequency ?? "daily";

  if (frequency === "weekly" && reminder.dayOfWeek !== local.weekday) {
    return null;
  }

  if (frequency === "monthly" && reminder.dayOfMonth !== local.day) {
    return null;
  }

  const sentKey = `${reminder.userId}:${frequency}:${local.year}-${local.month}-${local.day}:${hour}:${minute}`;

  if (reminder.reminderSentKey === sentKey) {
    return null;
  }

  return sentKey;
}

async function runReminderPushCron() {
  configureWebPush();
  const client = await clientPromise;
  const db = client.db();
  const now = new Date();

  const reminders = await db
    .collection<ReminderDoc>("reminders")
    .find({ completed: { $ne: true } })
    .toArray();

  let checked = 0;
  let due = 0;
  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    checked++;

    const sentKey = isReminderDue(reminder, now);
    if (!sentKey || !reminder.userId) continue;

    due++;

    const subs = await db
      .collection("pushSubscriptions")
      .find({ userId: reminder.userId })
      .toArray();

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify({
            title: "Reminder",
            body: reminder.text || "You have a reminder due.",
          }),
        );
        sent++;
      } catch (err) {
        failed++;
        console.error("Push failed", err);
      }
    }

    await db.collection("reminders").updateOne(
      { _id: reminder._id },
      {
        $set: {
          reminderSentAt: now,
          reminderSentKey: sentKey,
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await runReminderPushCron();

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Reminder push cron failed", err);

    const message = err instanceof Error ? err.message : "Unknown cron error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
