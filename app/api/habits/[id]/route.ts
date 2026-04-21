import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { getHabitById, updateHabit, deleteHabit } from "@/lib/habitAccess";

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

  const habit = await getHabitById(userId, id);

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  return NextResponse.json({
    _id: String(habit._id),
    userId: habit.userId,
    title: habit.title,
    description: habit.description,
    hour: habit.hour,
    minute: habit.minute,
    zone: habit.zone,
    frequency: habit.frequency,
    dayOfWeek: habit.dayOfWeek ?? null,
    streak: habit.streak,
    lastCompletedAt: habit.lastCompletedAt
      ? habit.lastCompletedAt.toISOString()
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

  const body = await req.json();

  const success = await updateHabit(
    userId,
    id,
    body.title ?? "",
    body.description ?? "",
    Number(body.hour),
    Number(body.minute),
    body.zone ?? "",
    {
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek ?? null,
    },
  );

  if (!success) {
    return NextResponse.json(
      { error: "Failed to update habit" },
      { status: 400 },
    );
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

  const success = await deleteHabit(userId, id);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to delete habit" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
