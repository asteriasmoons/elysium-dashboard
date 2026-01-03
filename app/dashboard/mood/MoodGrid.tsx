"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./MoodGrid.module.css";

interface MoodLog {
  _id: string;
  userId: string;
  timestamp: string;
  moods: string[];
  activities: string[];
  note: string | null;
}

interface MoodGridProps {
  guildId?: string;
}

export default function MoodGrid({ guildId }: MoodGridProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/mood?limit=12");
        const data = await res.json();
		console.log("API Response:", data);
        setLogs(data.logs || []);
      } catch (error) {
        console.error("Error fetching mood logs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const backHref = guildId ? `/dashboard/${guildId}/features` : "/dashboard";
  const newLogHref = `/dashboard/mood/new${
    guildId ? `?guildId=${guildId}` : ""
  }`;
  const statsHref = `/dashboard/mood/stats${
    guildId ? `?guildId=${guildId}` : ""
  }`;
  const settingsHref = `/dashboard/mood/settings${
    guildId ? `?guildId=${guildId}` : ""
  }`;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Mood Tracker</h1>
            <p className={styles.subtitle}>
              Track your moods, activities, and reflections.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.push(backHref)}
            >
              Back
            </button>
          </div>
        </div>

        <div className={styles.buttonRow}>
          <Link href={newLogHref} className={styles.actionButton}>
            New Mood Log
          </Link>
          <Link href={statsHref} className={styles.actionButton}>
            View Stats
          </Link>
          <Link href={settingsHref} className={styles.actionButton}>
            Settings
          </Link>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading your mood logs...</div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>No mood logs yet</p>
            <p className={styles.emptySubtext}>
              Start tracking your moods to see patterns and insights.
            </p>
            <Link href={newLogHref} className={styles.emptyCta}>
              Create Your First Log
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {logs.map((log) => (
              <Link
                key={log._id}
                href={`/dashboard/mood/${log._id}${
                  guildId ? `?guildId=${guildId}` : ""
                }`}
                className={styles.card}
              >
                <div className={styles.cardTop}>
                  <h3 className={styles.cardTitle}>
                    {formatDate(log.timestamp)}
                  </h3>
                  <span className={styles.badge}>
                    {log.moods.length} mood{log.moods.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className={styles.moods}>
                  {log.moods.slice(0, 3).join(", ")}
                  {log.moods.length > 3 && ` +${log.moods.length - 3} more`}
                </div>

                {log.activities.length > 0 && (
                  <div className={styles.activities}>
                    Activities: {log.activities.slice(0, 2).join(", ")}
                    {log.activities.length > 2 &&
                      ` +${log.activities.length - 2}`}
                  </div>
                )}

                {log.note && (
                  <div className={styles.note}>
                    {log.note.substring(0, 100)}
                    {log.note.length > 100 && "..."}
                  </div>
                )}

                <div className={styles.cta}>View Details →</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
