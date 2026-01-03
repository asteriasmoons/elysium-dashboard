import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function getSessionUserId(session: unknown): string {
  if (typeof session !== "object" || session === null) {
    throw new Error("Invalid session object");
  }

  const s = session as Record<string, unknown>;
  const discordId = s["discordId"];

  if (typeof discordId === "string" && discordId.trim().length > 0) {
    return discordId.trim();
  }

  throw new Error("Missing session.discordId");
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const client = await clientPromise;
    const db = client.db();

    const logs = await db
      .collection("moodlogs")
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching mood logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);

  try {
    const body = await request.json();
    const { moods, activities, note } = body;

    if (!moods || moods.length === 0) {
      return NextResponse.json(
        { error: "At least one mood is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const newLog = {
      userId,
      guildId: null,
      timestamp: new Date(),
      moods,
      activities: activities || [],
      note: note || null,
    };

    const result = await db.collection("moodlogs").insertOne(newLog);

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...newLog,
    });
  } catch (error) {
    console.error("Error creating mood log:", error);
    return NextResponse.json(
      { error: "Failed to create log" },
      { status: 500 }
    );
  }
}
