import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/journalAccess";
import { getUserEntryById } from "@/lib/journalAccess";
import ViewEntryClient from "./ViewEntryClient";

export default async function JournalEntryViewPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { entryId } = await params;
  const userId = getSessionUserId(session);
  const entry = await getUserEntryById(userId, entryId);

  if (!entry) {
    redirect("/dashboard/journal");
  }

  return (
    <ViewEntryClient
      entryId={String(entry._id)}
      title={entry.title ?? ""}
      entry={entry.entry ?? ""}
      createdAt={
        entry.createdAt
          ? new Date(entry.createdAt).toISOString()
          : new Date().toISOString()
      }
    />
  );
}
