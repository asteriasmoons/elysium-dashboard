"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "./githubFeeds.module.css";

type Feed = {
  _id: string;
  repoUrl: string;
  branch: string;
  channelId: string;
};

type GuildChannel = { id: string; name: string };

export default function GitHubFeedsPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = String(params.guildId);

  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [channelId, setChannelId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchFeeds = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/github-feeds?guildId=${guildId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load feeds");
      setFeeds(Array.isArray(data.feeds) ? data.feeds : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feeds");
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/channels`)
      .then((r) => r.json())
      .then((d) => setChannels(Array.isArray(d.channels) ? d.channels : []))
      .catch(() => setChannels([]));
  }, [guildId]);

  function getChannelName(id: string) {
    const ch = channels.find((c) => c.id === id);
    return ch ? `#${ch.name}` : id;
  }

  async function handleDelete(feedId: string) {
    const res = await fetch(`/api/github-feeds/${feedId}?guildId=${guildId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      fetchFeeds();
    }
  }

  async function handleAdd() {
    setAddError("");
    if (!repoUrl || !channelId) {
      setAddError("Repo URL and channel are required.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/github-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, repoUrl, branch, channelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add feed");
      setRepoUrl("");
      setBranch("main");
      setChannelId("");
      fetchFeeds();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add feed");
    } finally {
      setAdding(false);
    }
  }

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.emptyText}>Loading...</p>
        </div>
      </div>
    );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>GitHub Feeds</h1>
            <p className={styles.subtitle}>
              Watch repositories and receive commit, issue, and release updates
              in your Discord channels.
            </p>
          </div>
          <Link href={`/dashboard/${guildId}`} className={styles.primaryLink}>
            Back
          </Link>
        </div>

        {/* Add Feed Form */}
        <div className={styles.card} style={{ marginBottom: "1.5rem" }}>
          <h2 className={styles.cardTitle}>Watch a Repository</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginTop: "1rem",
            }}
          >
            <input
              className={styles.input ?? ""}
              type="text"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
            <input
              className={styles.input ?? ""}
              type="text"
              placeholder="Branch (default: main)"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
            <select
              className={styles.input ?? ""}
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            >
              <option value="">Select a channel</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
            {addError && (
              <p style={{ color: "red", fontSize: "0.875rem" }}>{addError}</p>
            )}
            <button
              className={styles.editLink}
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? "Adding..." : "Watch Repo"}
            </button>
          </div>
        </div>

        {error && <p className={styles.emptyText}>{error}</p>}

        {feeds.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No repositories watched</h2>
            <p className={styles.emptyText}>
              Add a repo above to start receiving updates.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {feeds.map((feed) => (
              <div key={feed._id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.cardTitle}>
                      {feed.repoUrl.replace("https://github.com/", "")}
                    </h2>
                    <p className={styles.cardDescriptionMuted}>
                      Branch: <code>{feed.branch}</code>
                    </p>
                    <p className={styles.cardDescriptionMuted}>
                      Channel: {getChannelName(feed.channelId)}
                    </p>
                  </div>
                </div>

                {confirmDeleteId === feed._id ? (
                  <div className={styles.confirmBox}>
                    <p className={styles.confirmText}>
                      Unwatch this repository?
                    </p>
                    <div className={styles.confirmActions}>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(feed._id)}
                      >
                        Confirm
                      </button>
                      <button
                        className={styles.primaryLink}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardActions}>
                    <button
                      className={styles.deleteButton}
                      onClick={() => setConfirmDeleteId(feed._id)}
                    >
                      Unwatch
                    </button>
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
