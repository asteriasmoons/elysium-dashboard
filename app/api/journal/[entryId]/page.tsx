import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSessionUserId, getUserEntryById } from "@/lib/journalAccess";
import EntryClient from "@/app/dashboard/[guildId]/journal/[entryId]/EntryClient";

export default async function JournalEntryPage({
  params,
}: {
  params: { entryId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session);
  const doc = await getUserEntryById(userId, params.entryId);

  if (!doc) notFound();

  return (
    <EntryClient
      entryId={doc._id.toString()}
      initialTitle={doc.title}
      initialEntry={doc.entry}
      createdAt={doc.createdAt.toISOString()}
    />
  );
}
