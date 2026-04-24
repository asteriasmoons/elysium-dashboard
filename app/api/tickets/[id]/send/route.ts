import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTicketPanelById } from "@/lib/ticketAccess";

const BOT_API_BASE = process.env.BOT_API_URL; // your Railway bot URL

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BOT_API_BASE) {
    return NextResponse.json(
      { error: "Missing BOT_API_URL env" },
      { status: 500 },
    );
  }

  try {
    const body = await req.json();

    const guildId = String(body.guildId ?? "").trim();
    const channelId = String(body.channelId ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!guildId || !channelId) {
      return NextResponse.json(
        { error: "Missing guildId or channelId" },
        { status: 400 },
      );
    }

    const panel = await getTicketPanelById(guildId, params.id);

    if (!panel) {
      return NextResponse.json(
        { error: "Ticket panel not found" },
        { status: 404 },
      );
    }

    const payload = {
      guildId,
      channelId,
      message: message || null,
      panel: {
        panelName: panel.panelName,
        emoji: panel.emoji ?? null,
        greeting: panel.greeting ?? "",
        postChannelId: panel.postChannelId,
        ticketCategoryId: panel.ticketCategoryId,
        transcriptsEnabled: Boolean(panel.transcriptsEnabled),
        transcriptChannelId: panel.transcriptChannelId ?? null,
        roleToPing: panel.roleToPing ?? null,
        embed: panel.embed,
        greetingEmbed: panel.greetingEmbed ?? null,
      },
    };

    const res = await fetch(`${BOT_API_BASE}/api/ticketpanel/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || "Bot failed to send panel" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to send ticket panel",
      },
      { status: 500 },
    );
  }
}
