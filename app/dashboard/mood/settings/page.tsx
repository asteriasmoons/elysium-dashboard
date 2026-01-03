import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { guildId?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { guildId } = await searchParams;

  return <SettingsClient guildId={guildId} />;
}
