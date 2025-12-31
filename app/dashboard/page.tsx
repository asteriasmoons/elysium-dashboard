import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { GuildCard } from "@/components/GuildCard"

interface Guild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  botPresent: boolean
}

export default async function DashboardPage() {
  const session = await auth()

  // DEBUG: Log session to console
  console.log("=== DASHBOARD SESSION ===")
  console.log("Session exists:", !!session)
  console.log("Session user:", session?.user)
  console.log("Access token exists:", !!session?.accessToken)
  console.log("========================")

  if (!session) {
    console.log("No session found, redirecting to login...")
    redirect("/login")
  }

  let guilds: Guild[] = []

  if (session.accessToken) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      const res = await fetch(`${baseUrl}/api/guilds`, {
        headers: {
          Cookie: `next-auth.session-token=${session.accessToken}`,
        },
        cache: "no-store",
      })

      if (res.ok) {
        const data = await res.json()
        guilds = data.guilds || []
      }
    } catch (error) {
      console.error("Error fetching guilds:", error)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome, {session.user?.name}!
            </p>
          </div>
          <form
            action={async () => {
              "use server"
              const { signOut } = await import("@/lib/auth")
              await signOut({ redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Servers</h2>
          
          {guilds.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No servers found where you have manage permissions and the Elysium bot is installed.
              </p>
              
                <a href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Invite Elysium Bot to your server
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  )
}