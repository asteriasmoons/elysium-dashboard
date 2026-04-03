"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./detail.module.css";

interface MoodLog {
  _id: string;
  userId: string;
  timestamp: string;
  moods: string[];
  activities: string[];
  note: string | null;
}

interface DetailClientProps {
  id: string;
  guildId?: string;
}

export default function DetailClient({ id, guildId }: DetailClientProps) {
  const router = useRouter();
  const [log, setLog] = useState<MoodLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLog() {
      try {
        const res = await fetch(`/api/mood/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load log");
          setLoading(false);
          return;
        }

        setLog(data.log);
      } catch (err) {
        setError("Failed to load log");
      } finally {
        setLoading(false);
      }
    }
    fetchLog();
  }, [id]);

  async function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete this mood log? This cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/mood/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete log");
        setDeleting(false);
        return;
      }

      router.push(guildId ? `/dashboard/${guildId}` : `/dashboard/mood`);
    } catch (err) {
      setError("Failed to delete log");
      setDeleting(false);
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const backHref = guildId ? `/dashboard/${guildId}` : `/dashboard/mood`;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading mood log...</div>
        </div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>{error || "Log not found"}</div>
          <button
            className={styles.secondary}
            onClick={() => router.push(backHref)}
          >
            Back to Mood Logs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Mood Log</h1>
            <p className={styles.subtitle}>{formatDate(log.timestamp)}</p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.push(backHref)}
            >
              Back
            </button>
            <button
              type="button"
              className={styles.delete}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Moods</h3>
            <div className={styles.tagContainer}>
              {log.moods.map((mood) => (
                <span key={mood} className={styles.tag}>
                  {mood}
                </span>
              ))}
            </div>
          </div>

          {log.activities.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Activities</h3>
              <div className={styles.tagContainer}>
                {log.activities.map((activity) => (
                  <span key={activity} className={styles.tagActivity}>
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {log.note && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Note</h3>
              <div className={styles.noteContent}>{log.note}</div>
            </div>
          )}
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}
      </div>
    </div>
  );
}
