import { NextResponse } from "next/server";
import webpush from "web-push";
import clientPromise from "@/lib/mongodb";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.PUSH_CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const reminders = await db.collection("reminders").find({}).toArray();

  for (const reminder of reminders) {
    if (
      reminder.frequency !== "daily" ||
      reminder.hour !== currentHour ||
      reminder.minute !== currentMinute
    ) {
      continue;
    }

    const subs = await db
      .collection("pushSubscriptions")
      .find({ userId: reminder.userId })
      .toArray();

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify({
            title: "Reminder",
            body: reminder.text,
          }),
        );
      } catch (err) {
        console.error("Push failed", err);
      }
    }
  }

  return NextResponse.json({ success: true });
}
