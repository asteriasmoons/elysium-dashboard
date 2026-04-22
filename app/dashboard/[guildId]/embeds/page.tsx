"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "./embeds.module.css";

type Embed = {
  _id: string;
  name: string;
  title: string | null;
  description: string | null;
  color: string | null;
};

export default function EmbedsPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = String(params.guildId);

  const [embeds, setEmbeds] = useState<Embed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmbeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  async function fetchEmbeds() {
    try {
      const res = await fetch(`/api/embeds?guildId=${guildId}`);
      const data = await res.json();
      setEmbeds(data.embeds || []);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEmbedAction(formData: FormData) {
    const embedId = String(formData.get("embedId") ?? "").trim();
    if (!embedId) return;

    await fetch(`/api/embeds/${embedId}?guildId=${guildId}`, {
      method: "DELETE",
    });

    fetchEmbeds();
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* HEADER */}
          <div className={styles.headerRow}>
  <div>
    <h1 className={styles.title}>Embeds</h1>
    <p className={styles.subtitle}>
      Create, manage, and send embeds to your server.
    </p>
  </div>

  <div className={styles.actions}>
    <Link href={`/dashboard/${guildId}`} className={styles.primaryLink}>
      Back to Dashboard
    </Link>

    <Link
      href={`/dashboard/${guildId}/embeds/new`}
      className={styles.primaryLink}
    >
      + New Embed
    </Link>
  </div>
</div>
        </div>

        {/* GRID */}
        {loading ? (
          <p>Loading...</p>
        ) : embeds.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No embeds yet</h3>
            <p className={styles.emptyText}>
              Create your first embed to start using this feature.
            </p>

            <Link
              href={`/dashboard/${guildId}/embeds/new`}
              className={styles.primaryLink}
            >
              Create Embed
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {embeds.map((embed) => (
              <div key={embed._id} className={styles.card}>
                <div className={styles.cardTop}>
                  <h3 className={styles.cardTitle}>{embed.name}</h3>
                </div>

                <div className={styles.discordPreviewShell}>
                  <div
                    className={styles.discordEmbed}
                    style={{
                      borderLeftColor: embed.color || "#5865F2",
                    }}
                  >
                    <div className={styles.discordEmbedInner}>
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
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <Link
                    href={`/dashboard/${guildId}/embeds/${embed._id}`}
                    className={styles.editLink}
                  >
                    Edit
                  </Link>

                  <Link
                    href={`/dashboard/${guildId}/embeds/${embed._id}/send`}
                    className={styles.primaryLink}
                  >
                    Send
                  </Link>

                  <form action={deleteEmbedAction}>
                    <input type="hidden" name="embedId" value={embed._id} />
                    <button type="submit" className={styles.deleteButton}>
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
