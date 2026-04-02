import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v10"

export const ADMINISTRATOR = 0x00000008
export const MANAGE_GUILD = 0x00000020

export interface Guild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

export async function fetchUserGuilds(accessToken: string): Promise<Guild[]> {
  console.log("fetchUserGuilds called with token:", accessToken.substring(0, 20) + "...")
  
  const rest = new REST({ version: "10", authPrefix: "Bearer" }).setToken(accessToken)
  
  try {
    const guilds = await rest.get(Routes.userGuilds()) as Guild[]
    console.log("Discord API returned guilds:", guilds.length)
    console.log("First guild:", guilds[0])
    return guilds
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("fetchUserGuilds failed:", error.message)
    } else {
      console.error("fetchUserGuilds failed:", error)
    }

    // Attempt to log additional fields if they exist
    const err = error as { status?: unknown; rawError?: unknown }
    if (err.status) console.error("Error status:", err.status)
    if (err.rawError) console.error("Error body:", err.rawError)

    return []
  }
}

export function hasManageAccess(permissions: string): boolean {
  const perms = BigInt(permissions)
  return (
    (perms & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR) ||
    (perms & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD)
  )
}

export function filterManageableGuilds(guilds: Guild[]): Guild[] {
  return guilds.filter(guild =>
    guild.owner || hasManageAccess(guild.permissions)
  )
}

export async function isBotInGuild(guildId: string): Promise<boolean> {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error("DISCORD_BOT_TOKEN not set")
    return false
  }

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN)
  
  try {
    await rest.get(Routes.guild(guildId))
    return true
  } catch (error) {
    return false
  }
}

export function getGuildIconUrl(guild: Guild): string | null {
  if (!guild.icon) return null
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
}
