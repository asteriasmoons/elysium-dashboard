import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSessionUserId, getUserEntryById } from "@/lib/journalAccess";
import EntryClient from "./EntryClient";

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { entryId } = await params;
  const userId = getSessionUserId(session);
  const doc = await getUserEntryById(userId, entryId);

  if (!doc) notFound();

  return (
    <EntryClient
      entryId={doc._id.toString()}
      initialTitle={doc.title ?? "Untitled"}
      initialEntry={doc.entry ?? ""}
      createdAt={doc.createdAt.toISOString()}
    />
  );
}
