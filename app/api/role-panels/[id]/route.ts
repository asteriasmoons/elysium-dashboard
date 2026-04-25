import { NextResponse } from "next/server";
import {
  deleteRolePanel,
  getRolePanelById,
  updateRolePanel,
} from "@/lib/rolePanelAccess";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(req: Request, { params }: Params) {
  const url = new URL(req.url);
  const guildId = String(url.searchParams.get("guildId") ?? "").trim();
  const id = params.id;

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const panel = await getRolePanelById(guildId, id);

  if (!panel) {
    return NextResponse.json({ error: "Panel not found" }, { status: 404 });
  }

  return NextResponse.json({
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
    createdAt: panel.createdAt ? new Date(panel.createdAt).toISOString() : null,
    updatedAt: panel.updatedAt ? new Date(panel.updatedAt).toISOString() : null,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const url = new URL(req.url);
  const guildId = String(url.searchParams.get("guildId") ?? "").trim();
  const id = params.id;

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const body = await req.json();

  const success = await updateRolePanel(guildId, id, {
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

  if (!success) {
    return NextResponse.json({ error: "Update failed" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const url = new URL(req.url);
  const guildId = String(url.searchParams.get("guildId") ?? "").trim();
  const id = params.id;

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const success = await deleteRolePanel(guildId, id);

  if (!success) {
    return NextResponse.json({ error: "Delete failed" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
