import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteEmbed, getEmbedById, updateEmbed } from "@/lib/embedAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const guildId = String(searchParams.get("guildId") ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const { id } = await params;
  const embed = await getEmbedById(guildId, id);

  if (!embed) {
    return NextResponse.json({ error: "Embed not found" }, { status: 404 });
  }

  return NextResponse.json({
    _id: String(embed._id),
    guildId: embed.guildId,
    name: embed.name,
    creatorId: embed.creatorId,
    title: embed.title,
    description: embed.description,
    color: embed.color,
    author: {
      name: embed.author?.name ?? "",
      icon_url: embed.author?.icon_url ?? "",
    },
    footer: {
      text: embed.footer?.text ?? "",
      icon_url: embed.footer?.icon_url ?? "",
      timestamp: Boolean(embed.footer?.timestamp),
    },
    thumbnail: embed.thumbnail ?? "",
    image: embed.image ?? "",
    createdAt: embed.createdAt ? new Date(embed.createdAt).toISOString() : null,
    updatedAt: embed.updatedAt ? new Date(embed.updatedAt).toISOString() : null,
  });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const guildId = String(body.guildId ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const { id } = await params;

  const success = await updateEmbed(guildId, id, {
    name: body.name ?? "",
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

  if (!success) {
    return NextResponse.json(
      { error: "Failed to update embed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const guildId = String(searchParams.get("guildId") ?? "").trim();

  if (!guildId) {
    return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
  }

  const { id } = await params;
  const success = await deleteEmbed(guildId, id);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to delete embed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
