import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAfkConfig, updateAfkConfig } from "@/lib/afkAccess";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;
  const config = await getAfkConfig(guildId);

  return NextResponse.json({ config });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ guildId: string }> },
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;
  const body = await req.json();

  const config = await updateAfkConfig(guildId, {
    enabled: Boolean(body.enabled),
    noticeTitle: body.noticeTitle,
    noticeColor: body.noticeColor,
    defaultMessage: body.defaultMessage,
  });

  return NextResponse.json({ config });
}
