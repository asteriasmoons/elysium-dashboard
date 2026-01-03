import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StatsClient from "./StatsClient";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: { guildId?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { guildId } = await searchParams;

  return <StatsClient guildId={guildId} />;
}
