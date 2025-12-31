import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

// Discord Permission Constants
export const MANAGE_GUILD = 0x00000020; // Binary: 1 << 5

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

/**
 * Fetch user's guilds from Discord API
 */
export async function fetchUserGuilds(accessToken: string): Promise<Guild[]> {
  const rest = new REST({ version: "10" }).setToken(accessToken);

  try {
    const guilds = (await rest.get(Routes.userGuilds())) as Guild[];
    return guilds;
  } catch (error) {
    console.error("Error fetching user guilds:", error);
    return [];
  }
}

/**
 * Check if user has MANAGE_GUILD permission
 */
export function hasManageGuild(permissions: string): boolean {
  const perms = BigInt(permissions);
  return (perms & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
}

/**
 * Filter guilds to only those the user can manage
 */
export function filterManageableGuilds(guilds: Guild[]): Guild[] {
  return guilds.filter(
    (guild) => guild.owner || hasManageGuild(guild.permissions)
  );
}

/**
 * Check if bot is in a guild using bot token
 */
export async function isBotInGuild(guildId: string): Promise<boolean> {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error("DISCORD_BOT_TOKEN not set");
    return false;
  }

  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN
  );

  try {
    await rest.get(Routes.guild(guildId));
    return true;
  } catch (error) {
    // 404 means bot is not in the guild
    return false;
  }
}

/**
 * Get Discord CDN avatar URL
 */
export function getGuildIconUrl(guild: Guild): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
}
