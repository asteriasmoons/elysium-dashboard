import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { createHabit, listUserHabits } from "@/lib/habitAccess";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const habits = await listUserHabits(userId);

  return NextResponse.json({ habits });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const body = await req.json();

  const id = await createHabit(
    userId,
    body.name,
    body.description,
    Number(body.hour),
    Number(body.minute),
    body.timezone,
    {
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek ?? null,
    },
  );

  return NextResponse.json({ id });
}