import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    guildId: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { guildId } = await params;
    const safeGuildId = String(guildId ?? "").trim();

    if (!safeGuildId) {
      return NextResponse.json({ error: "Missing guildId" }, { status: 400 });
    }

    const botApiUrl = String(process.env.BOT_API_URL ?? "").trim();
    const botApiKey = String(process.env.BOT_API_KEY ?? "").trim();

    if (!botApiUrl || !botApiKey) {
      return NextResponse.json(
        { error: "Missing BOT_API_URL or BOT_API_KEY" },
        { status: 500 },
      );
    }

    const response = await fetch(`${botApiUrl}/guilds/${safeGuildId}/roles`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${botApiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || "Failed to load guild roles" },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json({
      roles: Array.isArray(data?.roles) ? data.roles : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load guild roles",
      },
      { status: 500 },
    );
  }
}
