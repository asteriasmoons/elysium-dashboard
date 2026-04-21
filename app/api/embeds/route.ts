import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { createEmbed, listGuildEmbeds } from "@/lib/embedAccess";

export async function GET(req: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const guildId = String(searchParams.get("guildId") ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const embeds = await listGuildEmbeds(guildId);

  return NextResponse.json({ embeds });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creatorId = getSessionUserId(session);
  const body = await req.json();

  const id = await createEmbed({
    guildId: body.guildId,
    name: body.name,
    creatorId,
    title: body.title ?? null,
    description: body.description ?? null,
    color: body.color ?? null,
    author: {
      name: body.author?.name ?? "",
      icon_url: body.author?.icon_url ?? "",
    },
    footer: {
      text: body.footer?.text ?? "",
      icon_url: body.footer?.icon_url ?? "",
      timestamp: Boolean(body.footer?.timestamp),
    },
    thumbnail: body.thumbnail ?? "",
    image: body.image ?? "",
  });

  return NextResponse.json({ id });
}
