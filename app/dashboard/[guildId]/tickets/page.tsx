"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import styles from "./tickets.module.css";
import RenderDiscordText from "@/components/discord/RenderDiscordText";

type TicketEmbedData = {
  title: string | null;
  description: string | null;
  color: string | null;
  author: {
    name: string | null;
    icon_url: string | null;
  };
  footer: {
    text: string | null;
    icon_url: string | null;
    timestamp: boolean;
  };
  thumbnail: string | null;
  image: string | null;
};

type TicketPanel = {
  _id: string;
  guildId: string;
  panelName: string;
  creatorId: string;
  emoji: string | null;
  greeting: string;
  postChannelId: string;
  ticketCategoryId: string;
  transcriptsEnabled: boolean;
  transcriptChannelId: string | null;
  roleToPing: string | null;
  embed: TicketEmbedData;
  greetingEmbed: TicketEmbedData | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type GuildChannel = {
  id: string;
  name: string;
  type?: number;
};

type GuildRole = {
  id: string;
  name: string;
  color?: string;
  position?: number;
};

export default function TicketsPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = String(params.guildId);

  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function fetchPanels() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/tickets?guildId=${guildId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load ticket panels");
      }

      setPanels(Array.isArray(data.panels) ? data.panels : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load panels");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPanels();
  }, [guildId]);

  useEffect(() => {
    async function fetchGuildMeta() {
      try {
        const [channelsRes, rolesRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/channels`),
          fetch(`/api/guilds/${guildId}/roles`),
        ]);

        const channelsData = await channelsRes.json();
        const rolesData = await rolesRes.json();

        setChannels(
          Array.isArray(channelsData.channels) ? channelsData.channels : [],
        );
        setRoles(Array.isArray(rolesData.roles) ? rolesData.roles : []);
      } catch {
        setChannels([]);
        setRoles([]);
      }
    }

    fetchGuildMeta();
  }, [guildId]);

  function getChannelName(channelId: string | null) {
    if (!channelId) return "None";
    const channel = channels.find((item) => item.id === channelId);
    return channel ? `#${channel.name}` : channelId;
  }

  function getCategoryName(channelId: string | null) {
    if (!channelId) return "None";
    const channel = channels.find((item) => item.id === channelId);
    return channel ? channel.name : channelId;
  }

  function getRoleName(roleId: string | null) {
    if (!roleId) return "None";
    const role = roles.find((item) => item.id === roleId);
    return role ? `@${role.name}` : roleId;
  }

  async function deletePanel(panelId: string) {
    try {
      setError("");

      const res = await fetch(`/api/tickets/${panelId}?guildId=${guildId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete ticket panel");
      }

      setConfirmDeleteId(null);
      fetchPanels();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete panel");
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Loading ticket panels...</p>
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
            <h1 className={styles.title}>Ticket Panels</h1>
            <p className={styles.subtitle}>
              Manage support panels, ticket greetings, transcript settings, and
              Discord-style ticket embeds.
            </p>
          </div>

          <div className={styles.actions}>
            <Link href={`/dashboard/${guildId}`} className={styles.primaryLink}>
              Back
            </Link>

            <Link
              href={`/dashboard/${guildId}/tickets/new`}
              className={styles.editLink}
            >
              New Panel
            </Link>
          </div>
        </div>

        {error ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>{error}</p>
          </div>
        ) : null}

        {panels.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No ticket panels yet</h2>
            <p className={styles.emptyText}>
              Create a panel to let members open private support tickets from a
              selected channel.
            </p>

            <Link
              href={`/dashboard/${guildId}/tickets/new`}
              className={styles.editLink}
            >
              Create Ticket Panel
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {panels.map((panel) => (
              <div key={panel._id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.cardTitle}>
                      <RenderDiscordText text={panel.panelName} />
                    </h2>

                    <p className={styles.cardDescriptionMuted}>
                      Post Channel: {getChannelName(panel.postChannelId)}
                    </p>
                  </div>

                  <span className={styles.activeBadge}>
                    {panel.transcriptsEnabled
                      ? "Transcripts On"
                      : "No Transcripts"}
                  </span>
                </div>

                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Ticket Category</span>
                    <span className={styles.metaValue}>
                      {getCategoryName(panel.ticketCategoryId)}
                    </span>
                  </div>

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Role To Ping</span>
                    <span className={styles.metaValue}>
                      {getRoleName(panel.roleToPing)}
                    </span>
                  </div>

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Transcript Channel</span>
                    <span className={styles.metaValue}>
                      {getChannelName(panel.transcriptChannelId)}
                    </span>
                  </div>

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Emoji</span>
                    <span className={styles.metaValue}>
                      {panel.emoji ? (
                        <RenderDiscordText text={panel.emoji} />
                      ) : (
                        "None"
                      )}
                    </span>
                  </div>
                </div>

                <div className={styles.spacingLg}>
                  <p className={styles.cardDescription}>
                    <RenderDiscordText
                      text={panel.greeting || "No greeting message set."}
                    />
                  </p>
                </div>

                <div className={styles.discordPreviewShell}>
                  <div
                    className={styles.discordEmbed}
                    style={{
                      borderLeftColor: panel.embed?.color || "#5865F2",
                    }}
                  >
                    <div className={styles.discordEmbedInner}>
                      {(panel.embed?.author?.name ||
                        panel.embed?.author?.icon_url) && (
                        <div className={styles.embedAuthorRow}>
                          {panel.embed?.author?.icon_url ? (
                            <Image
                              src={panel.embed.author.icon_url}
                              alt=""
                              width={20}
                              height={20}
                              unoptimized
                              className={styles.embedAuthorIcon}
                            />
                          ) : null}

                          <span className={styles.embedAuthorName}>
                            <RenderDiscordText
                              text={panel.embed?.author?.name || "Author"}
                            />
                          </span>
                        </div>
                      )}

                      <div className={styles.embedBodyRow}>
                        <div className={styles.embedMain}>
                          {panel.embed?.title ? (
                            <p className={styles.previewTitle}>
                              <RenderDiscordText text={panel.embed.title} />
                            </p>
                          ) : null}

                          {panel.embed?.description ? (
                            <p className={styles.previewDescription}>
                              <RenderDiscordText
                                text={panel.embed.description}
                              />
                            </p>
                          ) : (
                            <p className={styles.previewMuted}>
                              No embed description
                            </p>
                          )}
                        </div>

                        {panel.embed?.thumbnail ? (
                          <Image
                            src={panel.embed.thumbnail}
                            alt=""
                            width={80}
                            height={80}
                            unoptimized
                            className={styles.embedThumbnail}
                          />
                        ) : null}
                      </div>

                      {panel.embed?.image ? (
                        <Image
                          src={panel.embed.image}
                          alt=""
                          width={420}
                          height={220}
                          unoptimized
                          className={styles.embedImage}
                        />
                      ) : null}

                      {(panel.embed?.footer?.text ||
                        panel.embed?.footer?.icon_url ||
                        panel.embed?.footer?.timestamp) && (
                        <div className={styles.embedFooterRow}>
                          {panel.embed?.footer?.icon_url ? (
                            <Image
                              src={panel.embed.footer.icon_url}
                              alt=""
                              width={20}
                              height={20}
                              unoptimized
                              className={styles.embedFooterIcon}
                            />
                          ) : null}

                          <span className={styles.embedFooterText}>
                            <RenderDiscordText
                              text={panel.embed?.footer?.text || "Footer"}
                            />
                            {panel.embed?.footer?.timestamp
                              ? ` • ${new Date().toLocaleString()}`
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {confirmDeleteId === panel._id ? (
                  <div className={styles.confirmBox}>
                    <p className={styles.confirmText}>
                      Delete this ticket panel?
                    </p>

                    <div className={styles.confirmActions}>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => deletePanel(panel._id)}
                      >
                        Confirm Delete
                      </button>

                      <button
                        type="button"
                        className={styles.primaryLink}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className={styles.cardActions}>
                  <Link
                    href={`/dashboard/${guildId}/tickets/${panel._id}`}
                    className={styles.editLink}
                  >
                    Edit
                  </Link>

                  <button
                    type="button"
                    className={styles.primaryLink}
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          `/api/tickets/${panel._id}/send`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ guildId }),
                          },
                        );

                        const data = await res.json();

                        if (!res.ok) {
                          throw new Error(
                            data?.error || "Failed to send panel",
                          );
                        }

                        alert("Ticket panel sent successfully.");
                      } catch (err) {
                        alert(
                          err instanceof Error
                            ? err.message
                            : "Failed to send panel",
                        );
                      }
                    }}
                  >
                    Send
                  </button>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => setConfirmDeleteId(panel._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
