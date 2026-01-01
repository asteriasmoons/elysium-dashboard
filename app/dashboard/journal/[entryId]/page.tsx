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

  try {
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
  } catch {
    notFound();
  }
<<<<<<< HEAD:app/dashboard/journal/[entryId]/page.tsx
}
=======
}
>>>>>>> 4db9da847ffeffe5c77040e715fdbae4656eb177:app/dashboard/[guildId]/journal/[entryId]/page.tsx
