import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MoodGrid from "./MoodGrid";

export default async function MoodPage({
  searchParams,
}: {
  searchParams: { guildId?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { guildId } = await searchParams;

  return <MoodGrid guildId={guildId} />;
}
