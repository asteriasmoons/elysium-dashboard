import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { createReminder, listUserReminders, listGuildReminders } from "@/lib/reminderAccess";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guildId");

  const reminders = guildId
    ? await listGuildReminders(guildId)
    : await listUserReminders(userId);

  return NextResponse.json({ reminders });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const body = await req.json();

  const type = body.type === "guild" ? "guild" : "dm";

  if (type === "guild" && !body.guildId) {
    return NextResponse.json({ error: "Missing guildId for guild reminder" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  if (!body.interval) {
    return NextResponse.json({ error: "Missing interval" }, { status: 400 });
  }

  if (!body.startDate) {
    return NextResponse.json({ error: "Missing startDate" }, { status: 400 });
  }

  const id = await createReminder(userId, {
    type,
    name: body.name,
    creatorId: userId,
    interval: body.interval,
    startDate: body.startDate,
    ping: body.ping ?? "",
    channelId: body.channelId ?? null,
    dayOfWeek: body.dayOfWeek ?? null,
    embedTitle: body.embedTitle ?? "Reminder!",
    embedDescription: body.embedDescription ?? "",
    embedColor: body.embedColor ?? "#8757f2",
    timezone: body.timezone ?? "America/Chicago",
    lastSent: null,
    ...(type === "guild" ? { guildId: body.guildId } : {}),
  });

  return NextResponse.json({ id });
}
