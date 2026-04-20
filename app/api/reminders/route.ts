import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { createReminder, listUserReminders } from "@/lib/reminderAccess";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const reminders = await listUserReminders(userId);

  return NextResponse.json({ reminders });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);

  const body = await req.json();

  const id = await createReminder(
    userId,
    body.text,
    body.hour,
    body.minute,
    body.zone,
    body.guildId ?? null,
    {
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek ?? null,
      dayOfMonth: body.dayOfMonth ?? null,
    },
    body.reminderSentAt ? new Date(body.reminderSentAt) : null
  );

  return NextResponse.json({ id });
}
