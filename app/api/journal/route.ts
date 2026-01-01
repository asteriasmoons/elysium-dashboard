import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createUserEntry,
  getSessionUserId,
  listUserEntries,
} from "@/lib/journalAccess";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const entries = await listUserEntries(userId);

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e._id.toString(),
      userId: e.userId,
      title: e.title,
      entry: e.entry,
      createdAt: e.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);

  try {
    const body = (await req.json()) as { title?: string; entry?: string };
    const id = await createUserEntry(
      userId,
      body.title ?? "",
      body.entry ?? ""
    );
    return NextResponse.json({ id }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err) || "Failed to create entry" },
      { status: 400 }
    );
  }
}
