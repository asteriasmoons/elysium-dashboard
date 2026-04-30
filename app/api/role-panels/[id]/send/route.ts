import { NextResponse } from "next/server";
import { getRolePanelById } from "@/lib/rolePanelAccess";

const BOT_API_BASE = process.env.BOT_API_URL;
const BOT_API_KEY = process.env.BOT_API_KEY;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!BOT_API_BASE || !BOT_API_KEY) {
    return NextResponse.json(
      { error: "Missing bot API configuration" },
      { status: 500 },
    );
  }

  const body = await req.json();

  const guildId = String(body.guildId ?? "").trim();
  const channelId = String(body.channelId ?? "").trim();

  if (!guildId || !channelId) {
    return NextResponse.json(
      { error: "Missing guildId or channelId" },
      { status: 400 },
    );
  }

  const panel = await getRolePanelById(guildId, id);

  if (!panel) {
    return NextResponse.json(
      { error: "Role panel not found" },
      { status: 404 },
    );
  }

  const payload = {
    guildId,
    channelId,
    panel: {
      _id: String(panel._id),
      panelName: panel.panelName,
      type: panel.type,
      selectMode: panel.selectMode,
      roles: (panel.roles ?? []).map((role) => ({
        roleId: role.roleId,
        label: role.label,
        emoji: role.emoji ?? null,
        description: role.description ?? null,
        order: role.order ?? 0,
      })),
      channelId: panel.channelId ?? null,
      messageId: panel.messageId ?? null,
      embedTitle: panel.embedTitle ?? null,
      embedDescription: panel.embedDescription ?? null,
      embedColor: panel.embedColor ?? "#00bfff",
    },
  };

  const res = await fetch(`${BOT_API_BASE}/api/rolepanel/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BOT_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error || "Bot failed to send role panel" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    messageId: data?.messageId ?? null,
    channelId: data?.channelId ?? channelId,
  });
}
