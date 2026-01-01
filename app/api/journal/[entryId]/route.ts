import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteUserEntry,
  getSessionUserId,
  getUserEntryById,
  updateUserEntry,
} from "@/lib/journalAccess";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export async function GET(
  _req: Request,
  { params }: { params: { entryId: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);

  try {
    const doc = await getUserEntryById(userId, params.entryId);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      entry: {
        id: doc._id.toString(),
        userId: doc.userId,
        title: doc.title,
        entry: doc.entry,
        createdAt: doc.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { entryId: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);

  try {
    const body = (await req.json()) as { title?: string; entry?: string };

    const ok = await updateUserEntry(
      userId,
      params.entryId,
      body.title ?? "",
      body.entry ?? ""
    );

    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err) || "Failed to update entry" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { entryId: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);

  try {
    const ok = await deleteUserEntry(userId, params.entryId);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }
}
