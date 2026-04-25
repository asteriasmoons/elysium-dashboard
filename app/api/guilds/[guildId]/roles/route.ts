import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    guildId: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { guildId } = await params;

  const botApiUrl = process.env.BOT_API_URL;

  if (!botApiUrl) {
    return NextResponse.json(
      { error: "Missing bot API configuration" },
      { status: 500 },
    );
  }

  const targetUrl = `${botApiUrl}/guilds/${guildId}/roles`;

  const response = await fetch(targetUrl, {
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        error: data?.error || "Failed to load roles",
        guildId,
        targetUrl,
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    roles: Array.isArray(data?.roles) ? data.roles : [],
  });
}
