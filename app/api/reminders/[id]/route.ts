import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { getReminderById, updateReminder } from "@/lib/reminderAccess";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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
    userId: reminder.userId,
    guildId: reminder.guildId ?? null,
    hour: reminder.hour,
    minute: reminder.minute,
    text: reminder.text,
    zone: reminder.zone,
    frequency: reminder.frequency,
    dayOfWeek: reminder.dayOfWeek ?? null,
    dayOfMonth: reminder.dayOfMonth ?? null,
    reminderSentAt: reminder.reminderSentAt
      ? reminder.reminderSentAt.toISOString()
      : null,
  });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { id } = await params;

  const body = (await req.json()) as {
    text?: string;
    hour?: number;
    minute?: number;
    zone?: string;
    guildId?: string | null;
    frequency?: "daily" | "weekly" | "monthly";
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    reminderSentAt?: string | null;
  };

  const success = await updateReminder(
    userId,
    id,
    body.text ?? "",
    Number(body.hour),
    Number(body.minute),
    body.zone ?? "",
    body.guildId ?? null,
    {
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek ?? null,
      dayOfMonth: body.dayOfMonth ?? null,
    },
    body.reminderSentAt ? new Date(body.reminderSentAt) : null,
  );

  if (!success) {
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
