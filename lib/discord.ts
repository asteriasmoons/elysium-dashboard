import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v10"

export const MANAGE_GUILD = 0x00000020

export interface Guild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

export async function fetchUserGuilds(accessToken: string): Promise<Guild[]> {
  const rest = new REST({ version: "10" }).setToken(accessToken)
  
  try {
    const guilds = await rest.get(Routes.userGuilds()) as Guild[]
    return guilds
  } catch (error) {
    console.error("Error fetching user guilds:", error)
    return []
  }
}

export function hasManageGuild(permissions: string): boolean {
  const perms = BigInt(permissions)
  return (perms & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD)
}

export function filterManageableGuilds(guilds: Guild[]): Guild[] {
  return guilds.filter(guild => 
    guild.owner || hasManageGuild(guild.permissions)
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
