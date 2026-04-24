import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { createTicketPanel, listGuildTicketPanels } from "@/lib/ticketAccess";

export async function GET(req: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const guildId = String(url.searchParams.get("guildId") ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const panels = await listGuildTicketPanels(guildId);

  return NextResponse.json({
    panels: panels.map((panel) => ({
      _id: String(panel._id),
      guildId: panel.guildId,
      panelName: panel.panelName,
      creatorId: panel.creatorId,
      emoji: panel.emoji ?? null,
      greeting: panel.greeting ?? "",
      postChannelId: panel.postChannelId,
      ticketCategoryId: panel.ticketCategoryId,
      transcriptsEnabled: Boolean(panel.transcriptsEnabled),
      transcriptChannelId: panel.transcriptChannelId ?? null,
      roleToPing: panel.roleToPing ?? null,
      embed: panel.embed,
      greetingEmbed: panel.greetingEmbed ?? null,
      createdAt: panel.createdAt
        ? new Date(panel.createdAt).toISOString()
        : null,
      updatedAt: panel.updatedAt
        ? new Date(panel.updatedAt).toISOString()
        : null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creatorId = getSessionUserId(session);
  const body = await req.json();

  const id = await createTicketPanel({
    guildId: body.guildId,
    creatorId,
    panelName: body.panelName,
    emoji: body.emoji ?? null,
    greeting: body.greeting ?? "",
    postChannelId: body.postChannelId,
    ticketCategoryId: body.ticketCategoryId,
    transcriptsEnabled: Boolean(body.transcriptsEnabled),
    transcriptChannelId: body.transcriptChannelId ?? null,
    roleToPing: body.roleToPing ?? null,
    embed: body.embed,
    greetingEmbed: body.greetingEmbed,
  });

  return NextResponse.json({ id });
}
