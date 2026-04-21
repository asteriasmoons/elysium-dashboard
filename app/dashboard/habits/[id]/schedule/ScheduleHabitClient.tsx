"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../../habits.module.css";

type HabitFrequency = "daily" | "weekly";

type HabitData = {
  _id: string;
  title: string;
  description: string;
  hour: number;
  minute: number;
  zone: string;
  frequency: HabitFrequency;
  dayOfWeek: number | null;
  streak: number;
  lastCompletedAt: string | null;
};

type Props = {
  habitId: string;
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

function formatTimePreview(hour: number, minute: number) {
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function ScheduleHabitClient({ habitId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [zone, setZone] = useState("America/Chicago");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHabit() {
      try {
        const res = await fetch(`/api/habits/${habitId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load habit");
        }

        if (cancelled) return;

        const habit = data as HabitData;

        setTitle(habit.title ?? "");
        setDescription(habit.description ?? "");
        setHour(Number(habit.hour ?? 9));
        setMinute(Number(habit.minute ?? 0));
        setZone(habit.zone ?? "America/Chicago");
        setFrequency(habit.frequency ?? "daily");
        setDayOfWeek(typeof habit.dayOfWeek === "number" ? habit.dayOfWeek : 1);
        setStreak(Number(habit.streak ?? 0));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load habit");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHabit();

    return () => {
      cancelled = true;
    };
  }, [habitId]);

  const scheduleLabel = useMemo(() => {
    if (frequency === "daily") {
      return `Daily at ${formatTimePreview(hour, minute)}`;
    }

    const weekday =
      WEEKDAY_OPTIONS.find((option) => option.value === dayOfWeek)?.label ??
      "Monday";

    return `Weekly on ${weekday} at ${formatTimePreview(hour, minute)}`;
  }, [frequency, dayOfWeek, hour, minute]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          hour,
          minute,
          zone,
          frequency,
          dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update habit schedule");
      }

      window.location.href = `/dashboard/habits/${habitId}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update habit schedule",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.panel}>
            <p className={styles.cardDescription}>Loading schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Schedule Habit</h1>
            <p className={styles.subtitle}>
              Adjust when this habit should appear and repeat.
            </p>
          </div>

          <div className={styles.actions}>
            <Link
              href={`/dashboard/habits/${habitId}`}
              className={styles.primaryLink}
            >
              Back
            </Link>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.cardWide}`}>
          <form onSubmit={handleSubmit} className={styles.formStack}>
            <div className={styles.panel}>
              <div className={styles.cardTop}>
                <h2 className={styles.cardTitle}>{title || "Habit"}</h2>
                <span className={styles.activeBadge}>{streak} streak</span>
              </div>

              {description ? (
                <p className={styles.cardDescription}>{description}</p>
              ) : (
                <p className={styles.cardDescriptionMuted}>No description</p>
              )}

              <p className={styles.cardTime}>{scheduleLabel}</p>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.label}>Frequency</span>

              <div className={styles.pillGroup}>
                <button
                  type="button"
                  className={
                    frequency === "daily" ? styles.pillActive : styles.pill
                  }
                  onClick={() => setFrequency("daily")}
                >
                  Daily
                </button>

                <button
                  type="button"
                  className={
                    frequency === "weekly" ? styles.pillActive : styles.pill
                  }
                  onClick={() => setFrequency("weekly")}
                >
                  Weekly
                </button>
              </div>
            </div>

            {frequency === "weekly" && (
              <div className={styles.fieldGroup}>
                <span className={styles.label}>Day of Week</span>

                <div className={styles.pillGroup}>
                  {WEEKDAY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        dayOfWeek === option.value
                          ? styles.pillSmallActive
                          : styles.pillSmall
                      }
                      onClick={() => setDayOfWeek(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.rowFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="hour">
                  Hour
                </label>
                <select
                  id="hour"
                  className={styles.glassSelect}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, value) => (
                    <option key={value} value={value}>
                      {String(value).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="minute">
                  Minute
                </label>
                <select
                  id="minute"
                  className={styles.glassSelect}
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                >
                  {Array.from({ length: 60 }, (_, value) => (
                    <option key={value} value={value}>
                      {String(value).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="zone">
                Time Zone
              </label>
              <input
                id="zone"
                className={styles.input}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="America/Chicago"
                autoComplete="off"
              />
            </div>

            {error ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>{error}</p>
              </div>
            ) : null}

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.deleteButton}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
