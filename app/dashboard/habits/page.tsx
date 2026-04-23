"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./habits.module.css";

function getEmojiSrc(emojiId: string, animated?: boolean): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=64&quality=lossless`;
}

function renderDiscordPreview(text: string) {
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

    parts.push(
      <Image
        key={`${id}-${start}-${fullMatch}`}
        src={getEmojiSrc(id, Boolean(animatedFlag))}
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

type Habit = {
  _id: string;
  name: string;
  description: string;
  hour: number;
  minute: number;
  frequency: "daily" | "weekly";
  dayOfWeek?: number | null;
  streak?: number;
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [habitActionLoadingId, setHabitActionLoadingId] = useState<string | null>(null);
  const [habitActionMessage, setHabitActionMessage] = useState<string>("");

  useEffect(() => {
    fetchHabits();
  }, []);

  async function fetchHabits() {
    try {
      const res = await fetch("/api/habits");
      const data = await res.json();
      setHabits(data.habits || []);
    } finally {
      setLoading(false);
    }
  }

  async function deleteHabitAction(formData: FormData) {
    const habitId = String(formData.get("habitId") ?? "").trim();
    if (!habitId) return;

    await fetch(`/api/habits/${habitId}`, {
      method: "DELETE",
    });

    fetchHabits();
    setConfirmDeleteId(null);
  }

  async function handleHabitAction(
    habitId: string,
    action: "yes" | "nottoday" | "skip",
  ) {
    setHabitActionLoadingId(habitId);
    setHabitActionMessage("");

    try {
      const res = await fetch(`/api/habits/${habitId}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update habit");
      }

      if (action === "yes") {
        setHabitActionMessage("Habit completed. 10 XP awarded.");
      } else if (action === "nottoday") {
        setHabitActionMessage("Marked as not today. 2 XP awarded.");
      } else {
        setHabitActionMessage("Habit skipped. XP unchanged.");
      }

      fetchHabits();
    } catch (err) {
      setHabitActionMessage(
        err instanceof Error ? err.message : "Failed to update habit",
      );
    } finally {
      setHabitActionLoadingId(null);
    }
  }

  const totalHabits = habits.length;
  const totalStreak = habits.reduce((acc, h) => acc + (h.streak || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* HEADER */}
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Habits</h1>
            <p className={styles.subtitle}>
              Build consistency. Strengthen your system.
            </p>
          </div>

          <div className={styles.actions}>
  <Link href="/dashboard" className={styles.primaryLink}>
    Back to Dashboard
  </Link>

  <Link href="/dashboard/habits/new" className={styles.primaryLink}>
    + New Habit
  </Link>
</div>
        </div>

        {/* STREAK CARD */}
        <div className={styles.panel}>
          <h2 className={styles.cardTitle}>Your Streaks</h2>

          <p className={styles.cardDescription}>Total Habits: {totalHabits}</p>

          <p className={styles.cardDescription}>
            Combined Streak: {totalStreak}
          </p>
        </div>

        {habitActionMessage ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>{habitActionMessage}</p>
          </div>
        ) : null}

        {/* GRID */}
        <div className={styles.spacingLg} />

        {loading ? (
          <p>Loading...</p>
        ) : habits.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No habits yet</h3>
            <p className={styles.emptyText}>
              Create your first habit to begin building consistency.
            </p>
            <Link href="/dashboard/habits/new" className={styles.primaryLink}>
              Create Habit
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {habits.map((habit) => (
              <div key={habit._id} className={styles.card}>
                <div className={styles.cardTop}>
                  <h3 className={styles.cardTitle}>{renderDiscordPreview(habit.name)}</h3>

                  {(habit.streak ?? 0) > 0 && (
                    <span className={styles.activeBadge}>
                      {habit.streak ?? 0} streak
                    </span>
                  )}
                </div>

                {habit.description ? (
                  <p className={styles.cardDescription}>
                    {renderDiscordPreview(habit.description)}
                  </p>
                ) : (
                  <p className={styles.cardDescriptionMuted}>No description</p>
                )}

                <div className={styles.cardTime}>
                  {habit.hour.toString().padStart(2, "0")}:
                  {habit.minute.toString().padStart(2, "0")} •{" "}
                  {habit.frequency === "daily"
                    ? "Daily"
                    : `Weekly (${dayName(habit.dayOfWeek)})`}
                </div>

                {/* ACTIONS */}
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.editLink}
                    disabled={habitActionLoadingId === habit._id}
                    onClick={() => handleHabitAction(habit._id, "yes")}
                  >
                    Yes
                  </button>

                  <button
                    type="button"
                    className={styles.editLink}
                    disabled={habitActionLoadingId === habit._id}
                    onClick={() => handleHabitAction(habit._id, "nottoday")}
                  >
                    Not Today
                  </button>

                  <button
                    type="button"
                    className={styles.editLink}
                    disabled={habitActionLoadingId === habit._id}
                    onClick={() => handleHabitAction(habit._id, "skip")}
                  >
                    Skip
                  </button>

                  <Link
                    href={`/dashboard/habits/${habit._id}`}
                    className={styles.editLink}
                  >
                    Edit
                  </Link>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => setConfirmDeleteId(habit._id)}
                  >
                    Delete
                  </button>
                </div>
                {confirmDeleteId === habit._id && (
                  <div className={styles.confirmBox}>
                    <p className={styles.cardDescription}>
                      Are you sure you want to delete this habit?
                    </p>

                    <div className={styles.confirmActions}>
                      <form action={deleteHabitAction}>
                        <input type="hidden" name="habitId" value={habit._id} />
                        <button type="submit" className={styles.deleteButton}>
                          Confirm Delete
                        </button>
                      </form>

                      <button
                        type="button"
                        className={styles.primaryLink}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function dayName(day?: number | null) {
  if (day == null) return "";
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][day];
}
