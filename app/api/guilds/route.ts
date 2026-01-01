import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

const MANAGE_GUILD = 0x20;

export async function GET() {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch guilds" },
      { status: 500 }
    );
  }

  const guilds: DiscordGuild[] = await res.json();

  // Only guilds user owns or can manage
  const manageable = guilds.filter(
    (g) =>
      g.owner || (Number(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD
  );

  return NextResponse.json(
    manageable.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
        : null,
      owner: g.owner,
    }))
  );
}