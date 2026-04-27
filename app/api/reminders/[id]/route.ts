import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { getReminderById, updateReminder, deleteReminder } from "@/lib/reminderAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { id } = await params;
  const reminder = await getReminderById(userId, id);

  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  return NextResponse.json({
    _id: String(reminder._id),
    type: reminder.type,
    name: reminder.name,
    userId: reminder.userId ?? null,
    guildId: reminder.guildId ?? null,
    creatorId: reminder.creatorId,
    interval: reminder.interval,
    startDate: reminder.startDate ? reminder.startDate.toISOString() : null,
    ping: reminder.ping ?? "",
    channelId: reminder.channelId ?? null,
    dayOfWeek: reminder.dayOfWeek ?? null,
    embedTitle: reminder.embedTitle,
    embedDescription: reminder.embedDescription,
    embedColor: reminder.embedColor,
    timezone: reminder.timezone,
    lastSent: reminder.lastSent ? reminder.lastSent.toISOString() : null,
  });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { id } = await params;
  const body = await req.json();

  const success = await updateReminder(userId, id, {
    interval: body.interval,
    startDate: body.startDate,
    ping: body.ping,
    channelId: body.channelId,
    dayOfWeek: body.dayOfWeek,
    embedTitle: body.embedTitle,
    embedDescription: body.embedDescription,
    embedColor: body.embedColor,
    timezone: body.timezone,
  });

  if (!success) {
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { id } = await params;

  const success = await deleteReminder(userId, id);

  if (!success) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
