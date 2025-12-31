import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  fetchUserGuilds,
  filterManageableGuilds,
  isBotInGuild,
  getGuildIconUrl,
} from "@/lib/discord";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 400 });
  }

  try {
    const allGuilds = await fetchUserGuilds(accessToken);
    const manageableGuilds = filterManageableGuilds(allGuilds);

    const guildsWithBotStatus = await Promise.all(
      manageableGuilds.map(async (guild) => {
        const botPresent = await isBotInGuild(guild.id);
        return {
          id: guild.id,
          name: guild.name,
          icon: getGuildIconUrl(guild),
          owner: guild.owner,
          permissions: guild.permissions,
          botPresent,
        };
      })
    );

    const guildsWithBot = guildsWithBotStatus.filter((g) => g.botPresent);

    return NextResponse.json({ guilds: guildsWithBot });
  } catch (error) {
    console.error("Error fetching guilds:", error);
    return NextResponse.json(
      { error: "Failed to fetch guilds" },
      { status: 500 }
    );
  }
}
