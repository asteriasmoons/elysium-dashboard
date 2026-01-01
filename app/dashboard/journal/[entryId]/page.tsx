import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSessionUserId, getUserEntryById } from "@/lib/journalAccess";
import EntryClient from "./EntryClient";

export default async function JournalEntryPage({
  params,
}: {
  params: { entryId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session);

  let doc;
  try {
    doc = await getUserEntryById(userId, params.entryId);
  } catch {
    notFound();
  }

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
