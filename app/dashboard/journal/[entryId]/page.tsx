import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import styles from "./entry.module.css";
import { getSessionUserId, getUserEntryById } from "@/lib/journalAccess";
import EntryClient from "./EntryClient";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Failed to load this entry.";
}

export default async function JournalEntryPage({
  params,
}: {
  params: { entryId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session);
  console.log("[Journal entry] userId:", userId, "entryId:", params.entryId);

  try {
    const doc = await getUserEntryById(userId, params.entryId);

    // IMPORTANT: don’t hard-404 here. Show a real message so we can debug.
    if (!doc) {
      return (
        <div className={styles.page}>
          <div className={styles.container}>
            <h1 className={styles.title}>Entry not found</h1>
            <p className={styles.subtitle}>
              This entry could not be loaded. It may not exist, or it may belong to a different account.
            </p>
          </div>
        </div>
      );
    }

    return (
      <EntryClient
        entryId={doc._id.toString()}
        initialTitle={doc.title}
        initialEntry={doc.entry}
        createdAt={doc.createdAt.toISOString()}
      />
    );
  } catch (err: unknown) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Couldn’t open entry</h1>
          <p className={styles.subtitle}>{getErrorMessage(err)}</p>
          <p className={styles.subtitle}>
            Entry id: <code>{params.entryId}</code>
          </p>
        </div>
      </div>
    );
  }
}