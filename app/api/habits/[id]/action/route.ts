import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import clientPromise from "@/lib/mongodb";

type HabitAction = "yes" | "nottoday" | "skip";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const HABIT_LOG_COLLECTION = "habitlogs";

function getXp(action: HabitAction) {
  switch (action) {
    case "yes":
      return 10;
    case "nottoday":
      return 2;
    case "skip":
    default:
      return 0;
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { id } = await params;

  const body = await req.json();

  const action = String(body.action ?? "") as HabitAction;

  if (!["yes", "nottoday", "skip"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid habit action" },
      { status: 400 },
    );
  }

  const client = await clientPromise;
  const db = client.db();

  const xp = getXp(action);

  await db.collection(HABIT_LOG_COLLECTION).insertOne({
    userId,
    habitId: id,
    action,
    timestamp: new Date(),
    xp,
  });

  return NextResponse.json({
    success: true,
    action,
    xp,
  });
}
