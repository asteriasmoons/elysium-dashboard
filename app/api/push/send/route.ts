import { NextResponse } from "next/server";
import webpush from "web-push";
import clientPromise from "@/lib/mongodb";

type StoredPushSubscription = webpush.PushSubscription & {
  _id?: unknown;
};

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST() {
  const client = await clientPromise;
  const db = client.db();

  const subs = await db
    .collection<StoredPushSubscription>("pushSubscriptions")
    .find({})
    .toArray();

  for (const sub of subs) {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: sub.keys,
      },
      JSON.stringify({
        title: "Elysium",
        body: "This is a test notification",
      }),
    );
  }

  return NextResponse.json({ success: true });
}
