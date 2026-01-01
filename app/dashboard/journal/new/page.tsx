import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NewEntryClient from "./NewEntryClient";

export default async function NewJournalEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ guildId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { guildId } = await searchParams;

  return <NewEntryClient guildId={guildId} />;
}
