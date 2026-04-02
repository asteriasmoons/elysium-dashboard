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
    body.title,
    new Date(body.time),
    body.description,
  );

  return NextResponse.json({ id });
}
