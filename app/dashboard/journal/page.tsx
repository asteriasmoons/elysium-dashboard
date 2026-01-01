import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./journal.module.css";
import {
  getSessionUserId,
  listUserEntries,
  FREE_JOURNAL_LIMIT,
} from "@/lib/journalAccess";
import { JournalGrid, JournalEntryDTO } from "@/components/JournalGrid";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Failed to load journal entries.";
}

export default async function JournalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session);
  console.log("[Journal list] userId:", userId);

  let entries: JournalEntryDTO[] = [];
  let loadError: string | null = null;

  try {
    const docs = await listUserEntries(userId);

    entries = docs.map((d) => ({
      id: d._id.toString(),
      userId: d.userId,
      title: d.title,
      entry: d.entry,
      createdAt: d.createdAt,
    }));
  } catch (err: unknown) {
    loadError = getErrorMessage(err);
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Journal</h1>
            <p className={styles.subtitle}>
              {entries.length} of {FREE_JOURNAL_LIMIT} entries used
            </p>
          </div>

          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.secondaryLink}>
              Back
            </Link>

            <Link href="/dashboard/journal/new" className={styles.primaryLink}>
              New Entry
            </Link>
          </div>
        </div>

        <div className={styles.panel}>
          {loadError ? (
            <div className={styles.empty}>
              <p className={styles.emptyText}>Your journal couldn’t load.</p>
              <p className={styles.emptySubtext}>{loadError}</p>
            </div>
          ) : (
            <JournalGrid entries={entries} />
          )}
        </div>
      </div>
    </div>
  );
}
