import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteFeed } from "@/lib/githubFeedAccess";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const guildId = new URL(req.url).searchParams.get("guildId") ?? "";
  if (!guildId)
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });

  const success = await deleteFeed(guildId, id);
  if (!success)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
