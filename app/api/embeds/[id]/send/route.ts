import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { getEmbedById } from "@/lib/embedAccess";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = getSessionUserId(session);
    const body = await req.json();

    const guildId = String(body.guildId ?? "").trim();
    const channelId = String(body.channelId ?? "").trim();

    if (!guildId) {
      return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
    }

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const { id } = await params;

    const embedDoc = await getEmbedById(guildId, id);

    if (!embedDoc) {
      return NextResponse.json({ error: "Embed not found" }, { status: 404 });
    }

    if (String(embedDoc.creatorId ?? "").trim() !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBotApiUrl = String(process.env.BOT_API_URL ?? "").trim();
    const botApiKey = String(process.env.BOT_API_KEY ?? "").trim();

    if (!rawBotApiUrl) {
      return NextResponse.json(
        { error: "Missing BOT_API_URL" },
        { status: 500 },
      );
    }

    if (!botApiKey) {
      return NextResponse.json(
        { error: "Missing BOT_API_KEY" },
        { status: 500 },
      );
    }

    let sendEmbedUrl: string;

    try {
      sendEmbedUrl = new URL("/send-embed", rawBotApiUrl).toString();
    } catch {
      return NextResponse.json(
        { error: "BOT_API_URL is invalid" },
        { status: 500 },
      );
    }

    const discordEmbed: Record<string, unknown> = {};

    if (embedDoc.title?.trim()) {
      discordEmbed.title = embedDoc.title.trim();
    }

    if (embedDoc.description?.trim()) {
      discordEmbed.description = embedDoc.description.trim();
    }

    if (embedDoc.color?.trim()) {
      const parsedColor = Number.parseInt(
        embedDoc.color.replace("#", ""),
        16,
      );

      if (!Number.isNaN(parsedColor)) {
        discordEmbed.color = parsedColor;
      }
    }

    if (embedDoc.author?.name?.trim()) {
      const author: { name: string; icon_url?: string } = {
        name: embedDoc.author.name.trim(),
      };

      if (embedDoc.author.icon_url?.trim()) {
        author.icon_url = embedDoc.author.icon_url.trim();
      }

      discordEmbed.author = author;
    }

    if (embedDoc.footer?.text?.trim() || embedDoc.footer?.timestamp) {
      const footer: { text?: string; icon_url?: string } = {};

      if (embedDoc.footer.text?.trim()) {
        footer.text = embedDoc.footer.text.trim();
      }

      if (embedDoc.footer.icon_url?.trim()) {
        footer.icon_url = embedDoc.footer.icon_url.trim();
      }

      if (Object.keys(footer).length > 0) {
        discordEmbed.footer = footer;
      }
    }

    if (embedDoc.thumbnail?.trim()) {
      discordEmbed.thumbnail = {
        url: embedDoc.thumbnail.trim(),
      };
    }

    if (embedDoc.image?.trim()) {
      discordEmbed.image = {
        url: embedDoc.image.trim(),
      };
    }

    if (embedDoc.footer?.timestamp) {
      discordEmbed.timestamp = new Date().toISOString();
    }

    const botResponse = await fetch(sendEmbedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botApiKey}`,
      },
      body: JSON.stringify({
        guildId,
        channelId,
        embed: discordEmbed,
      }),
      cache: "no-store",
    });

    const botData = await botResponse.json().catch(() => null);

    if (!botResponse.ok) {
      return NextResponse.json(
        { error: botData?.error || "Bot failed to send embed" },
        { status: botResponse.status || 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send embed",
      },
      { status: 500 },
    );
  }
}