import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

const MANAGE_GUILD = 0x20; // Regular number

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
    const errorText = await res.text();
    console.error("Discord API error:", res.status, errorText);
    return NextResponse.json(
      { 
        error: "Failed to fetch guilds",
        status: res.status,
        details: errorText 
      },
      { status: 500 }
    );
  }

  const guilds: DiscordGuild[] = await res.json();

  const manageable = guilds.filter(
    (g) =>
      g.owner || (BigInt(g.permissions) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD)
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
