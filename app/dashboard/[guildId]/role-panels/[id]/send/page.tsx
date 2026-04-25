"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "../../role-panels.module.css";

type Channel = {
  id: string;
  name: string;
  type?: number;
};

export default function SendRolePanelPage() {
  const params = useParams<{ guildId: string; id: string }>();
  const guildId = String(params.guildId);
  const panelId = String(params.id);

  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    async function loadChannels() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/channels`);
        const data = await res.json();

        const list = Array.isArray(data.channels)
          ? data.channels.filter((channel: Channel) =>
              [0, 5].includes(Number(channel.type)),
            )
          : [];

        setChannels(list);
        setChannelId((current) => current || list[0]?.id || "");
      } catch {
        setChannels([]);
      }
    }

    loadChannels();
  }, [guildId]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSending(true);
      setStatus(null);

      const res = await fetch(`/api/role-panels/${panelId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guildId,
          channelId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send role panel");
      }

      setStatus({
        type: "success",
        message: "Role panel sent successfully.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to send role panel.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Send Role Panel</h1>
          <p className={styles.subtitle}>
            Choose where this role panel should be posted.
          </p>
        </div>

        <button
          type="button"
          className={styles.editButton}
          onClick={() => router.push(`/dashboard/${guildId}/role-panels`)}
        >
          Back
        </button>
      </div>

      <form onSubmit={handleSend} className={styles.formStack}>
        <div className={styles.card}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Post Channel</label>
            <select
              className={styles.glassSelect}
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            >
              <option value="">Choose channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {status ? (
          <div
            className={`${styles.sendStatusBox} ${
              status.type === "success"
                ? styles.sendStatusSuccess
                : styles.sendStatusError
            }`}
          >
            <p className={styles.sendStatusKicker}>
              {status.type === "success" ? "Panel Sent" : "Panel Not Sent"}
            </p>
            <p className={styles.sendStatusMessage}>{status.message}</p>
          </div>
        ) : null}

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={sending || !channelId}
          >
            {sending ? "Sending..." : "Send Panel"}
          </button>
        </div>
      </form>
    </div>
  );
}
