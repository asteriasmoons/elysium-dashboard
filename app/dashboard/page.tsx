// This is the server listings page 
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { GuildCard } from "@/components/GuildCard"
import { fetchUserGuilds, filterManageableGuilds, isBotInGuild, getGuildIconUrl } from "@/lib/discord"

import styles from "./dashboard.module.css"

interface Guild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  botPresent: boolean
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  let guilds: Guild[] = []

  // Fetch guilds directly (no API route needed)
  if (session.accessToken) {
    try {
      console.log("=== FETCHING GUILDS ===")
      
      const allGuilds = await fetchUserGuilds(session.accessToken)
      console.log("Total guilds from Discord:", allGuilds.length)
      
      const manageableGuilds = filterManageableGuilds(allGuilds)
      console.log("Manageable guilds:", manageableGuilds.length)
      console.log("Manageable guild names:", manageableGuilds.map(g => g.name))

      const guildsWithBotStatus = await Promise.all(
        manageableGuilds.map(async (guild) => {
          const botPresent = await isBotInGuild(guild.id)
          console.log(`Bot in "${guild.name}":`, botPresent)
          return {
            id: guild.id,
            name: guild.name,
            icon: getGuildIconUrl(guild),
            owner: guild.owner,
            permissions: guild.permissions,
            botPresent,
          }
        })
      )

      guilds = guildsWithBotStatus.filter(g => g.botPresent)
      console.log("Guilds with bot:", guilds.length)
      console.log("===================")
      
    } catch (error) {
      console.error("Error fetching guilds:", error)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div className={styles.divider} />
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>Welcome, {session.user?.name}!</p>
          </div>

          <form
            action={async () => {
              "use server";
              const { signOut } = await import("@/lib/auth");
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className={styles.signOutButton}>
              Sign Out
            </button>
          </form>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Your Servers</h2>

          {guilds.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>
                No servers found where you have manage permissions and the
                Elysium bot is installed.
              </p>

              <a
                href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.inviteLink}
              >
                Invite Elysium Bot to your server
              </a>
            </div>
          ) : (
            <div className={styles.grid}>
              {guilds.map((guild) => (
                <GuildCard
                  key={guild.id}
                  id={guild.id}
                  name={guild.name}
                  icon={guild.icon}
                  owner={guild.owner}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}