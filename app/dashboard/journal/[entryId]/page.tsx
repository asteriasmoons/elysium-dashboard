import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSessionUserId, getUserEntryById } from "@/lib/journalAccess";
import EntryClient from "./EntryClient";

export default async function JournalEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ guildId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { entryId } = await params;
  const { guildId } = await searchParams;
  const userId = getSessionUserId(session);
  const doc = await getUserEntryById(userId, entryId);

  if (!doc) notFound();

  return (
    <EntryClient
      guildId={guildId}
      entryId={doc._id.toString()}
      initialTitle={doc.title ?? "Untitled"}
      initialEntry={doc.entry ?? ""}
      createdAt={doc.createdAt.toISOString()}
    />
  );
}
