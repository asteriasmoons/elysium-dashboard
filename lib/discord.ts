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
 * Fetch user's guilds from Discord API (requires USER OAuth token)
 */
export async function fetchUserGuilds(accessToken: string): Promise<Guild[]> {
  if (!accessToken) {
    throw new Error("fetchUserGuilds: accessToken is missing");
  }

  const rest = new REST({ version: "10", authPrefix: "Bearer" }).setToken(
    accessToken
  );

  try {
    const guilds = (await rest.get(Routes.userGuilds())) as Guild[];
    return guilds;
  } catch (error) {
    console.error("Error fetching user guilds:", error);
    throw error;
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
 * Check if bot is in a guild using BOT token
 */
export async function isBotInGuild(guildId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    console.error("DISCORD_BOT_TOKEN not set");
    return false;
  }

  if (!guildId) {
    throw new Error("isBotInGuild: guildId is missing");
  }

  const rest = new REST({ version: "10", authPrefix: "Bot" }).setToken(
    botToken
  );

  try {
    await rest.get(Routes.guild(guildId));
    return true;
  } catch (error) {
    // Narrow safely without using `any`
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status?: number }).status === 404
    ) {
      return false;
    }

    console.error(`Error checking bot presence for guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Get Discord CDN guild icon URL
 */
export function getGuildIconUrl(guild: Guild): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
}
