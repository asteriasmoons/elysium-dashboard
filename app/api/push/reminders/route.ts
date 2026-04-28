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
  type?: "guild" | "dm";
  userId?: string | null;
  name?: string;
  interval?: string;
  startDate?: Date | string;
  dayOfWeek?: string | null;
  embedTitle?: string;
  embedDescription?: string;
  timezone?: string;
  lastSent?: Date | string | null;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekdayShort: string;
  weekdayLong: string;
};

const TIMEZONE_MAP: Record<string, string> = {
  "Indian Standard Time": "Asia/Kolkata",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles",
};

const WEEKDAY_ALIASES: Record<string, string> = {
  sun: "Sunday",
  sunday: "Sunday",
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
};

function normalizeTimezone(timezone: unknown): string {
  const raw = String(timezone ?? "America/Chicago").trim() || "America/Chicago";
  return TIMEZONE_MAP[raw] ?? raw;
}

function normalizeWeekday(dayOfWeek: unknown): string | null {
  const raw = String(dayOfWeek ?? "").trim();
  if (!raw) return null;
  return WEEKDAY_ALIASES[raw.toLowerCase()] ?? raw;
}

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function parseIntervalMs(interval: unknown): number | null {
  const raw = String(interval ?? "").trim().toLowerCase();
  const match = raw.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)$/);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (["m", "min", "mins", "minute", "minutes"].includes(unit)) {
    return amount * 60 * 1000;
  }

  if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) {
    return amount * 60 * 60 * 1000;
  }

  if (["d", "day", "days"].includes(unit)) {
    return amount * 24 * 60 * 60 * 1000;
  }

  if (["w", "week", "weeks"].includes(unit)) {
    return amount * 7 * 24 * 60 * 60 * 1000;
  }

  return null;
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
    weekday: "long",
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const rawHour = Number(getPart("hour"));
  const hour = rawHour === 24 ? 0 : rawHour;
  const weekdayLong = getPart("weekday");

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    hour,
    minute: Number(getPart("minute")),
    weekdayShort: weekdayLong.slice(0, 3),
    weekdayLong,
  };
}

function isAllowedWeekday(reminder: ReminderDoc, now: Date): boolean {
  const dayOfWeek = normalizeWeekday(reminder.dayOfWeek);
  if (!dayOfWeek) return true;

  const timezone = normalizeTimezone(reminder.timezone);

  try {
    const local = getZonedParts(now, timezone);
    return local.weekdayLong === dayOfWeek || local.weekdayShort === dayOfWeek;
  } catch (err) {
    console.error("Invalid timezone while checking weekday, falling back to UTC:", timezone, err);
    const local = getZonedParts(now, "UTC");
    return local.weekdayLong === dayOfWeek || local.weekdayShort === dayOfWeek;
  }
}

function isReminderDue(reminder: ReminderDoc, now: Date): boolean {
  const startDate = toValidDate(reminder.startDate);
  if (!startDate) return false;

  if (now < startDate) return false;
  if (!isAllowedWeekday(reminder, now)) return false;

  const intervalMs = parseIntervalMs(reminder.interval);
  if (!intervalMs) return false;

  const lastSent = toValidDate(reminder.lastSent);
  const anchorDate = lastSent ?? startDate;
  const nextDueAt = lastSent
    ? new Date(lastSent.getTime() + intervalMs)
    : startDate;

  if (now < nextDueAt) return false;

  // If this reminder has never been sent and the start date is very old,
  // do not spam-catch-up forever. It is due once when the cron sees it.
  if (!lastSent && anchorDate <= now) return true;

  return true;
}

function getPushTitle(reminder: ReminderDoc): string {
  return String(reminder.embedTitle || reminder.name || "Reminder").replace(/[*_`~]/g, "").trim() || "Reminder";
}

function getPushBody(reminder: ReminderDoc): string {
  return String(reminder.embedDescription || "You have a reminder due.")
    .replace(/<a?:([a-zA-Z0-9_]+):(\d+)>/g, ":$1:")
    .replace(/[*_`~]/g, "")
    .trim() || "You have a reminder due.";
}

export async function runReminderPushCron() {
  configureWebPush();
  const client = await clientPromise;
  const db = client.db();
  const now = new Date();

  const reminders = await db
    .collection<ReminderDoc>("reminders")
    .find({ type: "dm", userId: { $type: "string", $ne: "" } })
    .toArray();

  let checked = 0;
  let due = 0;
  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    checked++;

    if (!reminder.userId) continue;
    if (!isReminderDue(reminder, now)) continue;

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
            title: getPushTitle(reminder),
            body: getPushBody(reminder),
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
          lastSent: now,
          updatedAt: now,
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
