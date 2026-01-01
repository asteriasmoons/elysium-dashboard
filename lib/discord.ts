import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

export const MANAGE_GUILD = 0x00000020; // 1 << 5

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export async function fetchUserGuilds(accessToken: string): Promise<Guild[]> {
  const rest = new REST({ version: "10" }).setToken(accessToken);

  try {
    const guilds = (await rest.get(Routes.userGuilds())) as Guild[];
    return guilds;
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("fetchUserGuilds failed:", {
      status: e?.status,
      message: e?.message,
    });
    return [];
  }
}

export function hasManageGuild(permissions: string): boolean {
  const perms = BigInt(permissions);
  return (perms & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
}

export function filterManageableGuilds(guilds: Guild[]): Guild[] {
  return guilds.filter((g) => g.owner || hasManageGuild(g.permissions));
}

export async function isBotInGuild(guildId: string): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.error("DISCORD_BOT_TOKEN not set");
    return false;
  }

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    await rest.get(Routes.guild(guildId));
    return true;
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("isBotInGuild failed:", {
      guildId,
      status: e?.status,
      message: e?.message,
    });

    // Expected "not installed in this guild"
    if (e?.status === 404) return false;

    // Anything else is *not* "bot missing", it’s an auth/permissions problem
    return false;
  }
}

export function getGuildIconUrl(guild: Guild): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
}