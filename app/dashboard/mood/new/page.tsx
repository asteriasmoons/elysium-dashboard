import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NewMoodClient from "./NewMoodClient";

export default async function NewMoodPage({
  searchParams,
}: {
  searchParams: { guildId?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { guildId } = await searchParams;

  return <NewMoodClient guildId={guildId} />;
}
