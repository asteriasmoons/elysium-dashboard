import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { id } = await params;

  try {
    const client = await clientPromise;
    const db = client.db();

    const log = await db.collection("moodlogs").findOne({
      _id: new ObjectId(id),
      userId,
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error("Error fetching mood log:", error);
    return NextResponse.json({ error: "Failed to fetch log" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const { id } = await params;

  try {
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("moodlogs").deleteOne({
      _id: new ObjectId(id),
      userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting mood log:", error);
    return NextResponse.json(
      { error: "Failed to delete log" },
      { status: 500 }
    );
  }
}
