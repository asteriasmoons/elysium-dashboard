import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const setting = await db.collection("moodremindersettings").findOne({
      userId: session.user.id,
    });

    if (!setting) {
      return NextResponse.json({
        isEnabled: false,
        hour: 9,
        minute: 0,
        frequency: "daily",
        timezone: "America/Chicago",
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error fetching reminder settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { isEnabled, hour, minute, frequency, timezone } = body;

    const client = await clientPromise;
    const db = client.db();

    const setting = await db
      .collection("moodremindersettings")
      .findOneAndUpdate(
        { userId: session.user.id },
        {
          $set: {
            userId: session.user.id,
            isEnabled,
            hour,
            minute,
            frequency,
            timezone,
          },
        },
        { upsert: true, returnDocument: "after" }
      );

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error updating reminder settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
