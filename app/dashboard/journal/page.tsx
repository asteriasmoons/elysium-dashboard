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

export default async function JournalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session);
  const docs = await listUserEntries(userId);

  const entries: JournalEntryDTO[] = docs.map((d) => ({
    id: d._id.toString(),
    userId: d.userId,
    title: d.title ?? "Untitled",
    entry: d.entry,
    createdAt: d.createdAt,
  }));

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
          <JournalGrid entries={entries} />
        </div>
      </div>
    </div>
  );
}