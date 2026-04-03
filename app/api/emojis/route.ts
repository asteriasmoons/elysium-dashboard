// app/api/emojis/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type DiscordGuild = {
  id: string;
  name: string;
};

type DiscordEmoji = {
  id: string | null;
  name: string;
  animated?: boolean;
};

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Discord access token" },
      { status: 401 },
    );
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Missing bot token" }, { status: 500 });
  }

  try {
    const userGuildsRes = await fetch(
      "https://discord.com/api/users/@me/guilds",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!userGuildsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user guilds" },
        { status: 500 },
      );
    }

    const userGuilds = (await userGuildsRes.json()) as DiscordGuild[];

    const emojiResults = await Promise.all(
      userGuilds.map(async (guild) => {
        const botGuildRes = await fetch(
          `https://discord.com/api/guilds/${guild.id}`,
          {
            headers: {
              Authorization: `Bot ${botToken}`,
            },
            cache: "no-store",
          },
        );

        if (!botGuildRes.ok) {
          return [];
        }

        const emojiRes = await fetch(
          `https://discord.com/api/guilds/${guild.id}/emojis`,
          {
            headers: {
              Authorization: `Bot ${botToken}`,
            },
            cache: "no-store",
          },
        );

        if (!emojiRes.ok) {
          return [];
        }

        const emojis = (await emojiRes.json()) as DiscordEmoji[];

        return emojis
          .filter((emoji) => emoji.id && emoji.name)
          .map((emoji) => ({
            id: String(emoji.id),
            name: emoji.name,
            animated: Boolean(emoji.animated),
            guildId: guild.id,
            guildName: guild.name,
          }));
      }),
    );

    const merged = emojiResults.flat();

    const unique = merged.filter(
      (emoji, index, arr) => arr.findIndex((e) => e.id === emoji.id) === index,
    );

    return NextResponse.json({ emojis: unique });
  } catch (error) {
    console.error("Emoji route failed:", error);
    return NextResponse.json(
      { error: "Failed to load emojis" },
      { status: 500 },
    );
  }
}
