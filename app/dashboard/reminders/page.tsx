import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { deleteReminder, listUserReminders } from "@/lib/reminderAccess";
import styles from "./reminders.module.css";

function formatNextFire(startDate: Date, interval: string): string {
  return new Date(startDate).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function RemindersPage() {
  const session = await auth();
  if (!session) return null;

  const userId = getSessionUserId(session);
  const reminders = (await listUserReminders(userId)).filter(r => r.name && String(r.name).trim());

  async function deleteReminderAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session) throw new Error("Unauthorized");
    const currentUserId = getSessionUserId(session);
    const reminderId = String(formData.get("reminderId") ?? "");
    if (!reminderId) throw new Error("Missing reminder id");
    await deleteReminder(currentUserId, reminderId);
    revalidatePath("/dashboard/reminders");
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Reminders</h1>
            <p className={styles.subtitle}>
              Manage your personal reminders and scheduled messages.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.secondaryLink}>
              Back
            </Link>
            <Link href="/dashboard/reminders/new" className={styles.primaryLink}>
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
              <Link href="/dashboard/reminders/new" className={styles.primaryLink}>
                New Reminder
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {reminders.map((reminder) => {
                const reminderId = String(reminder._id);
                const isDM = reminder.type === "dm";

                return (
                  <div key={reminderId} className={styles.card}>
                    <div className={styles.cardTop}>
                      <h2 className={styles.cardTitle}>{reminder.name}</h2>
                      <span className={isDM ? styles.activeBadge : styles.completedBadge}>
                        {isDM ? "DM" : "Server"}
                      </span>
                    </div>

                    {reminder.embedDescription ? (
                      <p className={styles.cardDescription}>
                        {reminder.embedDescription}
                      </p>
                    ) : (
                      <p className={styles.cardDescriptionMuted}>No description</p>
                    )}

                    <p className={styles.cardTime}>
                      Every{" "}
                      <strong>{reminder.interval}</strong>
                      {reminder.dayOfWeek ? ` · ${reminder.dayOfWeek}s` : ""}
                      {reminder.timezone ? ` · ${reminder.timezone}` : ""}
                    </p>

                    {reminder.startDate ? (
                      <p className={styles.cardTime} style={{ opacity: 0.6, fontSize: "0.8rem" }}>
                        Next: {formatNextFire(reminder.startDate, reminder.interval)}
                      </p>
                    ) : null}

                    <div className={styles.cardActions}>
                      <Link
                        href={`/dashboard/reminders/${reminderId}`}
                        className={styles.editLink}
                      >
                        Edit
                      </Link>
                      <form action={deleteReminderAction}>
                        <input type="hidden" name="reminderId" value={reminderId} />
                        <button type="submit" className={styles.deleteButton}>
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
