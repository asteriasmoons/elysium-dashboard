"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "../../embeds.module.css";

type EmbedData = {
  _id: string;
  guildId: string;
  name: string;
  creatorId: string;
  title: string | null;
  description: string | null;
  color: string | null;
  author: {
    name: string;
    icon_url: string;
  };
  footer: {
    text: string;
    icon_url: string;
    timestamp: boolean;
  };
  thumbnail: string;
  image: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type GuildChannel = {
  id: string;
  name: string;
  type?: number;
};

type Props = {
  embed: EmbedData;
  embedId: string;
  guildId: string;
  channels: GuildChannel[];
};

export default function SendEmbedClient({
  embed,
  embedId,
  guildId,
  channels,
}: Props) {
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/embeds/${embedId}/send`, {
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
        throw new Error(data?.error || "Failed to send embed");
      }

      setSuccess("Embed sent successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send embed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Send Embed</h1>
            <p className={styles.subtitle}>
              Choose a channel and send this saved embed.
            </p>
          </div>

          <div className={styles.actions}>
            <Link
              href={`/dashboard/${guildId}/embeds`}
              className={styles.primaryLink}
            >
              Back
            </Link>

            <Link
              href={`/dashboard/${guildId}/embeds/${embedId}`}
              className={styles.editLink}
            >
              Edit Embed
            </Link>
          </div>
        </div>

        <div className={styles.builderLayout}>
          <div className={styles.builderPanel}>
            <div className={styles.card}>
              <div className={styles.cardTop}>
                <h2 className={styles.cardTitle}>Send Settings</h2>
              </div>

              <form onSubmit={handleSend} className={styles.formStack}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="channelId">
                    Channel
                  </label>

                  <select
                    id="channelId"
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
                    className={styles.deleteButton}
                    disabled={sending || !channelId}
                  >
                    {sending ? "Sending..." : "Send Embed"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className={styles.previewPanel}>
            <div className={styles.previewCard}>
              <div className={styles.previewLabel}>Preview</div>

              <div className={styles.discordPreviewShell}>
                <div
                  className={styles.discordEmbed}
                  style={{ borderLeftColor: embed.color || "#5865F2" }}
                >
                  <div className={styles.discordEmbedInner}>
                    {(embed.author?.name || embed.author?.icon_url) && (
                      <div className={styles.embedAuthorRow}>
                        {embed.author?.icon_url ? (
                          <Image
                            src={embed.author.icon_url}
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
                            className={styles.embedAuthorIcon}
                          />
                        ) : null}
                        <span className={styles.embedAuthorName}>
                          {embed.author?.name || "Author"}
                        </span>
                      </div>
                    )}

                    <div className={styles.embedBodyRow}>
                      <div className={styles.embedMain}>
                        {embed.title ? (
                          <p className={styles.previewTitle}>{embed.title}</p>
                        ) : null}

                        {embed.description ? (
                          <p className={styles.previewDescription}>
                            {embed.description}
                          </p>
                        ) : (
                          <p className={styles.previewMuted}>No description</p>
                        )}
                      </div>

                      {embed.thumbnail ? (
                        <Image
                          src={embed.thumbnail}
                          alt=""
                          width={80}
                          height={80}
                          unoptimized
                          className={styles.embedThumbnail}
                        />
                      ) : null}
                    </div>

                    {embed.image ? (
                      <Image
                        src={embed.image}
                        alt=""
                        width={400}
                        height={220}
                        unoptimized
                        className={styles.embedImage}
                      />
                    ) : null}

                    {(embed.footer?.text ||
                      embed.footer?.icon_url ||
                      embed.footer?.timestamp) && (
                      <div className={styles.embedFooterRow}>
                        {embed.footer?.icon_url ? (
                          <Image
                            src={embed.footer.icon_url}
                            alt=""
                            width={20}
                            height={20}
                            unoptimized
                            className={styles.embedFooterIcon}
                          />
                        ) : null}
                        <span className={styles.embedFooterText}>
                          {embed.footer?.text || "Footer"}
                          {embed.footer?.timestamp
                            ? ` • ${new Date().toLocaleString()}`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.spacingLg}>
                <p className={styles.previewMuted}>
                  Sending: <strong>{embed.name}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
