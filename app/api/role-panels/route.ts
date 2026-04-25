import { NextResponse } from "next/server";
import { createRolePanel, listGuildRolePanels } from "@/lib/rolePanelAccess";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const guildId = String(url.searchParams.get("guildId") ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const panels = await listGuildRolePanels(guildId);

  return NextResponse.json({
    panels: panels.map((panel) => ({
      _id: String(panel._id),
      guildId: panel.guildId,
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
  const body = await req.json();

  const id = await createRolePanel({
    guildId: body.guildId,
    panelName: body.panelName,
    type: body.type ?? "select",
    selectMode: body.selectMode ?? "single",
    roles: Array.isArray(body.roles) ? body.roles : [],
    channelId: body.channelId ?? null,
    messageId: body.messageId ?? null,
    embedTitle: body.embedTitle ?? null,
    embedDescription: body.embedDescription ?? null,
    embedColor: body.embedColor ?? "#00bfff",
  });

  return NextResponse.json({ id });
}
