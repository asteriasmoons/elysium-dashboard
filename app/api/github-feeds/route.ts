import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listGuildFeeds, createFeed } from "@/lib/githubFeedAccess";

export async function GET(req: Request) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guildId = new URL(req.url).searchParams.get("guildId") ?? "";
  if (!guildId)
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });

  const feeds = await listGuildFeeds(guildId);

  return NextResponse.json({
    feeds: feeds.map((f) => ({
      _id: String(f._id),
      guildId: f.guildId,
      repoUrl: f.repoUrl,
      branch: f.branch,
      channelId: f.channelId,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { guildId, repoUrl, branch, channelId } = body;

  if (!guildId || !repoUrl || !channelId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const id = await createFeed({
    guildId,
    repoUrl,
    branch: branch || "main",
    channelId,
  });
  return NextResponse.json({ id });
}
