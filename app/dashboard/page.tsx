import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600 mb-8">Welcome, {session.user?.name}!</p>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">
            Guild selector will appear here in the next step.
          </p>
        </div>
      </div>
    </div>
  );
}
