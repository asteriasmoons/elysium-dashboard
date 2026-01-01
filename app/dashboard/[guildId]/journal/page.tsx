import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSessionUserId, getUserEntryById } from "@/lib/journalAccess";
import EntryClient from "./[entryId]/EntryClient";

export default async function EntryPage({
  params,
}: {
  params: { guildId: string; entryId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session);

  const doc = await getUserEntryById(userId, params.entryId);
  if (!doc) redirect(`/dashboard/${params.guildId}/journal`);

  return (
    <EntryClient
      entryId={params.entryId}
      initialTitle={doc.title}
      initialEntry={doc.entry}
      createdAt={doc.createdAt.toISOString()}
    />
  );
}
