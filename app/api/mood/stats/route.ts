import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { WithId, Document } from "mongodb";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "week";

  try {
    const client = await clientPromise;
    const db = client.db();

    let startDate: Date | null = null;
    const now = new Date();

    if (period === "today") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const query: { userId: string; timestamp?: { $gte: Date } } = {
      userId: session.user.id,
    };
    if (startDate) {
      query.timestamp = { $gte: startDate };
    }

    const logsRaw = await db
      .collection("moodlogs")
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    const logs = logsRaw as WithId<Document>[];

    if (logs.length === 0) {
      return NextResponse.json({
        logs: [],
        moodCounts: {},
        activityCounts: {},
        cooccurrences: [],
        totalLogs: 0,
      });
    }

    const moodCounts: Record<string, number> = {};
    let totalMoodSelections = 0;

    logs.forEach((log) => {
      const moods = log.moods as string[] | undefined;
      if (moods && moods.length > 0) {
        moods.forEach((mood) => {
          moodCounts[mood] = (moodCounts[mood] || 0) + 1;
          totalMoodSelections++;
        });
      }
    });

    const activityCounts: Record<string, number> = {};
    let totalActivitySelections = 0;

    logs.forEach((log) => {
      const activities = log.activities as string[] | undefined;
      if (activities && activities.length > 0) {
        activities.forEach((activity) => {
          activityCounts[activity] = (activityCounts[activity] || 0) + 1;
          totalActivitySelections++;
        });
      }
    });

    const cooccurrenceMap: Record<string, number> = {};

    logs.forEach((log) => {
      const moods = log.moods as string[] | undefined;
      const activities = log.activities as string[] | undefined;

      if (moods && activities) {
        moods.forEach((mood) => {
          activities.forEach((activity) => {
            const key = `${mood}|${activity}`;
            cooccurrenceMap[key] = (cooccurrenceMap[key] || 0) + 1;
          });
        });
      }
    });

    const cooccurrences = Object.entries(cooccurrenceMap)
      .map(([key, count]) => {
        const [mood, activity] = key.split("|");
        return { mood, activity, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      logs,
      moodCounts,
      activityCounts,
      cooccurrences,
      totalMoodSelections,
      totalActivitySelections,
      totalLogs: logs.length,
    });
  } catch (error) {
    console.error("Error fetching mood stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
