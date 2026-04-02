import Link from "next/link"
import "./globals.css"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Elysium Bot Dashboard</h1>
        <p className="subtitle">
          Manage your Discord server settings with ease. Configure commands,
          moderation, and more.
        </p>
        <div className="actions">
          <Link href="/login">
            <Button size="lg" className="primaryButton">
              Get Started
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="secondaryButton">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
