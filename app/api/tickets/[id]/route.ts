import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import {
  getTicketPanelById,
  updateTicketPanel,
  deleteTicketPanel,
} from "@/lib/ticketAccess";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const guildId = String(url.searchParams.get("guildId") ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const panel = await getTicketPanelById(guildId, id);

  if (!panel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
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
    createdAt: panel.createdAt ? new Date(panel.createdAt).toISOString() : null,
    updatedAt: panel.updatedAt ? new Date(panel.updatedAt).toISOString() : null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const guildId = String(url.searchParams.get("guildId") ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const body = await req.json();

  const success = await updateTicketPanel(guildId, id, {
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

  if (!success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const guildId = String(url.searchParams.get("guildId") ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const success = await deleteTicketPanel(guildId, id);

  if (!success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
