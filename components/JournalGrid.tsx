import Link from "next/link";
import styles from "./JournalGrid.module.css";

export interface JournalEntryDTO {
  id: string;
  userId: string;
  title: string;
  entry: string;
  createdAt: string | Date;
}

export function JournalGrid({
  guildId,
  entries,
}: {
  guildId: string;
  entries: JournalEntryDTO[];
}) {
  if (!entries || entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>No entries yet.</p>
        <p className={styles.emptySubtext}>
          Create your first entry to start building your journal.
        </p>
        <Link
          className={styles.emptyCta}
          href={`/dashboard/${guildId}/journal/new`}
        >
          New Entry
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {entries.map((e) => {
        const preview = e.entry?.slice(0, 120) ?? "";

        return (
          <Link
            key={e.id}
            href={`/dashboard/${guildId}/journal/${e.id}`}
            className={styles.card}
          >
            <div className={styles.cardTop}>
              <h3 className={styles.title}>{e.title || "Untitled"}</h3>
              <span className={styles.badge}>Entry</span>
            </div>

            <p className={styles.preview}>
              {preview.length > 0 ? preview : "No content yet."}
            </p>

            <div className={styles.cta}>Open</div>
          </Link>
        );
      })}
    </div>
  );
}
