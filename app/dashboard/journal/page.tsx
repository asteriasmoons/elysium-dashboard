import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./journal.module.css";
import {
  getSessionUserId,
  listUserEntries,
  FREE_JOURNAL_LIMIT,
} from "@/lib/journalAccess";

export default async function JournalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = getSessionUserId(session);
  const entries = await listUserEntries(userId);

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
          {entries.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No entries yet</p>
              <p className={styles.emptyText}>
                Create your first journal entry to begin.
              </p>
              <Link href="/dashboard/journal/new" className={styles.emptyCta}>
                New Entry
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {entries.map((e) => {
                const id = e._id.toString();
                return (
                  <Link
                    key={id}
                    href={`/dashboard/journal/${id}`}
                    className={styles.card}
                  >
                    <div className={styles.cardTop}>
                      <h3 className={styles.cardTitle}>{e.title}</h3>
                      <span className={styles.badge}>Entry</span>
                    </div>

                    <p className={styles.preview}>
                      {e.entry.length > 0
                        ? e.entry.slice(0, 120)
                        : "No content."}
                    </p>

                    <div className={styles.cta}>Edit</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}