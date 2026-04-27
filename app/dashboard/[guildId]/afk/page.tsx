"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import RenderDiscordText from "@/components/discord/RenderDiscordText";
import styles from "./afk.module.css";

type AfkConfig = {
  guildId: string;
  enabled: boolean;
  noticeTitle: string;
  noticeColor: string;
  defaultMessage: string;
};

export default function AfkViewPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = String(params.guildId);

  const [config, setConfig] = useState<AfkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/guilds/${guildId}/afk`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load");

        setConfig(data.config);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [guildId]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>AFK</h1>
            <p className={styles.subtitle}>
              View your server AFK configuration.
            </p>
          </div>

          <div className={styles.actions}>
            <Link
              href={`/dashboard/${guildId}/afk/new`}
              className={styles.primaryLink}
            >
              Edit
            </Link>
          </div>
        </div>

        <div className={styles.card}>
          {loading && <p className={styles.emptyText}>Loading...</p>}

          {error && <p className={styles.emptyText}>{error}</p>}

          {config && (
            <div className={styles.formStack}>
              <div className={styles.fieldGroup}>
                <span className={styles.label}>Status</span>
                <p className={styles.previewDescription}>
                  {config.enabled ? "Enabled" : "Disabled"}
                </p>
              </div>

              <div className={styles.fieldGroup}>
                <span className={styles.label}>Title</span>
                <p className={styles.previewDescription}>
                  {config.noticeTitle || "AFK Notice"}
                </p>
              </div>

              <div className={styles.fieldGroup}>
                <span className={styles.label}>Message</span>
                <p className={styles.previewDescription}>
                  <RenderDiscordText
                    text={config.defaultMessage || "No message set"}
                  />
                </p>
              </div>

              <div className={styles.fieldGroup}>
                <span className={styles.label}>Color</span>
                <div
                  style={{
                    width: 40,
                    height: 20,
                    borderRadius: 6,
                    background: config.noticeColor || "#58b2f2",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
