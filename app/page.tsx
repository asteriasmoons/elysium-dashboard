import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
          Elysium Bot Dashboard
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
          Manage your Discord server settings with ease. Configure commands,
          moderation, and more.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
