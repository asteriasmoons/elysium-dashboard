import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { deleteReminder, listUserReminders } from "@/lib/reminderAccess";
import styles from "./reminders.module.css";

function renderDiscordText(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, animatedFlag, name, id] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const ext = animatedFlag ? "gif" : "png";
    const src = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=64&quality=lossless`;

    parts.push(
      <Image
        key={`${id}-${start}`}
        src={src}
        alt={`:${name}:`}
        title={`:${name}:`}
        width={20}
        height={20}
        unoptimized
        style={{
          display: "inline-block",
          verticalAlign: "-0.2em",
          marginRight: 4,
        }}
      />,
    );

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.flatMap((part, index) => {
    if (typeof part !== "string") return part;

    return part.split("\n").flatMap((line, i, arr) => {
      if (i < arr.length - 1) {
        return [line, <br key={`br-${index}-${i}`} />];
      }
      return line;
    });
  });
}

export default async function RemindersPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const userId = getSessionUserId(session);
  const reminders = await listUserReminders(userId);

  async function deleteReminderAction(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const currentUserId = getSessionUserId(session);
    const reminderId = String(formData.get("reminderId") ?? "");

    if (!reminderId) {
      throw new Error("Missing reminder id");
    }

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
              {reminders.map((reminder) => {
                const reminderId = String(reminder._id);

                return (
                  <div key={reminderId} className={styles.card}>
                    <div className={styles.cardTop}>
                      <h2 className={styles.cardTitle}>Reminder</h2>
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

                    {reminder.text ? (
                      <p className={styles.cardDescription}>
                        {renderDiscordText(reminder.text)}
                      </p>
                    ) : (
                      <p className={styles.cardDescriptionMuted}>
                        No description
                      </p>
                    )}

                    <p className={styles.cardTime}>
                      {`${(reminder.hour % 12) || 12}:${String(reminder.minute).padStart(2, "0")} ${reminder.hour >= 12 ? "PM" : "AM"}`}
                    </p>

                    <div
                      className={styles.cardActions}
                      style={{ flexWrap: "wrap", gap: 8 }}
                    >
                      <Link
                        href={`/dashboard/reminders/${reminderId}/schedule`}
                        className={styles.editLink}
                      >
                        Schedule
                      </Link>

                      <Link
                        href={`/dashboard/reminders/${reminderId}/reschedule`}
                        className={styles.editLink}
                      >
                        Reschedule
                      </Link>

                      <Link
                        href={`/dashboard/reminders/${reminderId}`}
                        className={styles.editLink}
                      >
                        Edit
                      </Link>

                      <form action={deleteReminderAction}>
                        <input
                          type="hidden"
                          name="reminderId"
                          value={reminderId}
                        />
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
