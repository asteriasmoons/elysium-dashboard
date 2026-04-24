import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";

export async function POST(req: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const body = await req.json();

  if (!body?.endpoint || !body?.keys) {
    return NextResponse.json(
      { error: "Invalid push subscription" },
      { status: 400 },
    );
  }

  const client = await clientPromise;
  const db = client.db();
  const now = new Date();

  await db.collection("pushSubscriptions").updateOne(
    { userId, endpoint: body.endpoint },
    {
      $set: {
        userId,
        endpoint: body.endpoint,
        expirationTime: body.expirationTime ?? null,
        keys: body.keys,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ success: true });
}
