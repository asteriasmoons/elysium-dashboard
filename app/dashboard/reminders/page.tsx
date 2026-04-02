import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { listUserReminders } from "@/lib/reminderAccess";
import styles from "./reminders.module.css";

export default async function RemindersPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const userId = getSessionUserId(session);
  const reminders = await listUserReminders(userId);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Reminders</h1>
            <p className={styles.subtitle}>
              Manage your personal reminders and scheduled tasks.
            </p>
          </div>

          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.secondaryLink}>
              Back
            </Link>
            <Link
              href="/dashboard/reminders/new"
              className={styles.primaryLink}
            >
              New Reminder
            </Link>
          </div>
        </div>

        <div className={styles.panel}>
          {reminders.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No reminders yet.</p>
              <p className={styles.emptyText}>
                Create your first reminder to start keeping track of things.
              </p>
              <Link
                href="/dashboard/reminders/new"
                className={styles.primaryLink}
              >
                New Reminder
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {reminders.map((reminder) => (
                <div key={String(reminder._id)} className={styles.card}>
                  <div className={styles.cardTop}>
                    <h2 className={styles.cardTitle}>{reminder.title}</h2>
                    <span
                      className={
                        reminder.completed
                          ? styles.completedBadge
                          : styles.activeBadge
                      }
                    >
                      {reminder.completed ? "Completed" : "Active"}
                    </span>
                  </div>

                  {reminder.description ? (
                    <p className={styles.cardDescription}>
                      {reminder.description}
                    </p>
                  ) : (
                    <p className={styles.cardDescriptionMuted}>
                      No description
                    </p>
                  )}

                  <p className={styles.cardTime}>
                    {new Date(reminder.time).toLocaleString()}
                  </p>

                  <div className={styles.cardActions}>
                    <Link
                      href={`/dashboard/reminders/${String(reminder._id)}`}
                      className={styles.editLink}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
