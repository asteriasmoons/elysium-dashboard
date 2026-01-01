import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./journal.module.css";
import {
  getSessionUserId,
  listUserEntries,
  FREE_JOURNAL_LIMIT,
} from "@/lib/journalAccess";

export default async function JournalPage({
  params,
}: {
  params: { guildId: string };
}) {
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
              {entries.length} of {FREE_JOURNAL_LIMIT} entries used.
            </p>
          </div>

          <div className={styles.actions}>
            <Link
              href={`/dashboard/${params.guildId}`}
              className={styles.secondaryLink}
            >
              Back
            </Link>

            <Link
              href={`/dashboard/${params.guildId}/journal/new`}
              className={styles.primaryLink}
            >
              New Entry
            </Link>
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Entries</h2>
          <p className={styles.panelSubtitle}>
            Entries are private to your account and shown newest first.
          </p>

          {entries.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No entries yet.</p>
              <p className={styles.emptyText}>
                Create your first entry to begin.
              </p>
              <Link
                href={`/dashboard/${params.guildId}/journal/new`}
                className={styles.emptyCta}
              >
                New Entry
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {entries.map((e) => (
                <Link
                  key={e._id.toString()}
                  href={`/dashboard/${
                    params.guildId
                  }/journal/${e._id.toString()}`}
                  className={styles.card}
                >
                  <div className={styles.cardTop}>
                    <h3 className={styles.cardTitle}>{e.title}</h3>
                    <span className={styles.badge}>Entry</span>
                  </div>

                  <p className={styles.preview}>
                    {e.entry.length > 0 ? e.entry.slice(0, 120) : "No content."}
                  </p>

                  <div className={styles.cta}>Open</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
