"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "../../tickets.module.css";

type Channel = {
  id: string;
  name: string;
};

export default function SendTicketPanelPage() {
  const params = useParams<{ guildId: string; id: string }>();
  const guildId = String(params.guildId);
  const panelId = String(params.id);

  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadChannels() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/channels`);
        const data = await res.json();

        const list = Array.isArray(data.channels) ? data.channels : [];
        setChannels(list);

        if (list[0]?.id) {
          setChannelId(list[0].id);
        }
      } catch {
        setChannels([]);
      }
    }

    loadChannels();
  }, [guildId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/tickets/${panelId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guildId,
          channelId,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send panel");
      }

      setSuccess("Ticket panel sent successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send panel");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Send Ticket Panel</h1>
            <p className={styles.subtitle}>
              Choose where to post your ticket panel in Discord.
            </p>
          </div>
        </div>

        <form onSubmit={handleSend} className={styles.formStack}>
          <div className={styles.card}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Channel</label>
              <select
                className={styles.glassSelect}
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Optional Message (appears above panel)
              </label>
              <textarea
                className={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message above the panel..."
              />
            </div>
          </div>

          {error ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{error}</p>
            </div>
          ) : null}

          {success ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{success}</p>
            </div>
          ) : null}

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.editLink}
              disabled={sending}
            >
              {sending ? "Sending..." : "Send Panel"}
            </button>

            <button
              type="button"
              className={styles.primaryLink}
              onClick={() => router.push(`/dashboard/${guildId}/tickets`)}
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
