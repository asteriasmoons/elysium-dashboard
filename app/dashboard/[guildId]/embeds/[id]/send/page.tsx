"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
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

export default function SendEmbedPage() {
  const params = useParams<{ guildId: string; id: string }>();
  const guildId = String(params.guildId);
  const embedId = String(params.id);
  const router = useRouter();

  const [embed, setEmbed] = useState<EmbedData | null>(null);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const [embedRes, channelsRes] = await Promise.all([
          fetch(`/api/embeds/${embedId}?guildId=${guildId}`),
          fetch(`/api/guilds/${guildId}/channels`),
        ]);

        const embedData = await embedRes.json();
        const channelsData = await channelsRes.json();

        if (!embedRes.ok) {
          throw new Error(embedData?.error || "Failed to load embed");
        }

        if (!channelsRes.ok) {
          throw new Error(channelsData?.error || "Failed to load channels");
        }

        if (cancelled) return;

        const nextChannels = Array.isArray(channelsData.channels)
          ? channelsData.channels
          : [];

        setEmbed(embedData as EmbedData);
        setChannels(nextChannels);

        if (nextChannels.length > 0) {
          setChannelId(nextChannels[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load page");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [embedId, guildId]);

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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send embed");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Loading send page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!embed) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Embed not found</h3>
            <p className={styles.emptyText}>This embed could not be loaded.</p>
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
