"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./stats.module.css";

interface StatsData {
  moodCounts: Record<string, number>;
  activityCounts: Record<string, number>;
  cooccurrences: Array<{ mood: string; activity: string; count: number }>;
  totalMoodSelections: number;
  totalActivitySelections: number;
  totalLogs: number;
}

interface StatsClientProps {
  guildId?: string;
}

export default function StatsClient({ guildId }: StatsClientProps) {
  const router = useRouter();
  const [period, setPeriod] = useState("week");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/mood/stats?period=${period}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load stats");
          setLoading(false);
          return;
        }

        setStats(data);
      } catch (err) {
        setError("Failed to load stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [period]);

  const backHref = `/dashboard/mood${guildId ? `?guildId=${guildId}` : ""}`;

  const periodNames: Record<string, string> = {
    today: "Today",
    week: "Last 7 Days",
    month: "Last 30 Days",
    alltime: "All Time",
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Mood Statistics</h1>
            <p className={styles.subtitle}>Insights from your mood tracking</p>
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

        <div className={styles.periodSelector}>
          {Object.entries(periodNames).map(([key, label]) => (
            <button
              key={key}
              className={
                period === key ? styles.periodActive : styles.periodButton
              }
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loading}>Loading statistics...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : !stats || stats.totalLogs === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>No mood logs found</p>
            <p className={styles.emptySubtext}>
              {period === "today"
                ? "You haven't logged any moods today yet."
                : period === "week"
                ? "No mood logs in the last 7 days."
                : period === "month"
                ? "No mood logs in the last 30 days."
                : "You haven't logged any moods yet."}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.summaryBox}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryNumber}>{stats.totalLogs}</div>
                <div className={styles.summaryLabel}>Total Logs</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryNumber}>
                  {Object.keys(stats.moodCounts).length}
                </div>
                <div className={styles.summaryLabel}>Unique Moods</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryNumber}>
                  {Object.keys(stats.activityCounts).length}
                </div>
                <div className={styles.summaryLabel}>Unique Activities</div>
              </div>
            </div>

            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Mood Distribution</h2>
              {Object.keys(stats.moodCounts).length === 0 ? (
                <p className={styles.noData}>No moods logged in this period.</p>
              ) : (
                <div className={styles.statsList}>
                  {Object.entries(stats.moodCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([mood, count]) => {
                      const percentage = (
                        (count / stats.totalMoodSelections) *
                        100
                      ).toFixed(1);
                      return (
                        <div key={mood} className={styles.statItem}>
                          <div className={styles.statLabel}>
                            <span className={styles.statMood}>{mood}</span>
                            <span className={styles.statCount}>
                              {count} times ({percentage}%)
                            </span>
                          </div>
                          <div className={styles.statBar}>
                            <div
                              className={styles.statBarFill}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Activity Distribution</h2>
              {Object.keys(stats.activityCounts).length === 0 ? (
                <p className={styles.noData}>
                  No activities logged in this period.
                </p>
              ) : (
                <div className={styles.statsList}>
                  {Object.entries(stats.activityCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([activity, count]) => {
                      const percentage = (
                        (count / stats.totalActivitySelections) *
                        100
                      ).toFixed(1);
                      return (
                        <div key={activity} className={styles.statItem}>
                          <div className={styles.statLabel}>
                            <span className={styles.statActivity}>
                              {activity}
                            </span>
                            <span className={styles.statCount}>
                              {count} times ({percentage}%)
                            </span>
                          </div>
                          <div className={styles.statBar}>
                            <div
                              className={styles.statBarFillActivity}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {stats.cooccurrences.length > 0 && (
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Mood-Activity Connections</h2>
                <p className={styles.panelSubtitle}>
                  Top patterns in your logs
                </p>
                <div className={styles.connectionsList}>
                  {stats.cooccurrences.map((conn, idx) => (
                    <div key={idx} className={styles.connectionItem}>
                      <span className={styles.connectionMood}>{conn.mood}</span>
                      <span className={styles.connectionArrow}>→</span>
                      <span className={styles.connectionActivity}>
                        {conn.activity}
                      </span>
                      <span className={styles.connectionCount}>
                        {conn.count} {conn.count === 1 ? "time" : "times"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
