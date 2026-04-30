"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./role-panels.module.css";

type Role = {
  roleId: string;
  label: string;
  emoji: string | null;
  description: string | null;
  order: number;
};

type RolePanel = {
  _id: string;
  guildId: string;
  panelName: string;
  type: "select" | "buttons";
  selectMode: "single" | "multiple";
  roles: Role[];
  channelId: string | null;
  messageId: string | null;
  embedTitle: string | null;
  embedDescription: string | null;
  embedColor: string;
};

function renderRoleMentionsHtml(text: string | null, roles: Role[]) {
  if (!text) return "";
  const byId = new Map(roles.map(r => [r.roleId, r]));
  return text.replace(/<@&(\d+)>/g, (_, id) => {
    const role = byId.get(id);
    return role
      ? `<span class="${styles.roleMentionChip}">@${role.label}</span>`
      : `@unknown`;
  });
}

function renderEmojiHtml(value: string | null) {
  if (!value) return "•";

  return value
    .replace(/<a:([a-zA-Z0-9_]+):(\d+)>/g, (_match, name, id) => {
      return `<img alt=":${name}:" src="https://cdn.discordapp.com/emojis/${id}.gif" class="${styles.previewEmojiImage}" />`;
    })
    .replace(/<:([a-zA-Z0-9_]+):(\d+)>/g, (_match, name, id) => {
      return `<img alt=":${name}:" src="https://cdn.discordapp.com/emojis/${id}.png" class="${styles.previewEmojiImage}" />`;
    })
    .replace(/^([a-zA-Z0-9_]+):(\d+)$/g, (_match, name, id) => {
      return `<img alt=":${name}:" src="https://cdn.discordapp.com/emojis/${id}.png" class="${styles.previewEmojiImage}" />`;
    })
    .replace(/^(\d{17,22})$/g, (_match, id) => {
      return `<img alt="custom emoji" src="https://cdn.discordapp.com/emojis/${id}.png" class="${styles.previewEmojiImage}" />`;
    });
}

export default function RolePanelsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const router = useRouter();

  const [panels, setPanels] = useState<RolePanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchPanels = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/role-panels?guildId=${guildId}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch role panels");
      }

      setPanels(Array.isArray(data.panels) ? data.panels : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const handleDelete = async (panelId: string) => {
    try {
      const res = await fetch(`/api/role-panels/${panelId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete panel");
      }

      setPanels((prev) => prev.filter((p) => p._id !== panelId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  useEffect(() => {
    fetchPanels();
  }, [fetchPanels]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Role Panels</h1>
          <p className={styles.subtitle}>Manage your server role panels</p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.push(`/dashboard/${guildId}`)}
          >
            Back
          </button>

          <Link
            href={`/dashboard/${guildId}/role-panels/new`}
            className={styles.primaryButton}
          >
            New Panel
          </Link>
        </div>
      </div>

      {loading && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Loading role panels...</p>
        </div>
      )}

      {error && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>{error}</p>
        </div>
      )}

      {!loading && !error && panels.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No role panels found for this server.
          </p>
        </div>
      )}

      <div className={styles.grid}>
        {panels.map((panel) => (
          <div key={panel._id} className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                {panel.embedTitle || panel.panelName}
              </h2>
              <span className={styles.cardType}>
                {panel.type.toUpperCase()}
              </span>
            </div>

            <p
              className={styles.cardDescription}
              dangerouslySetInnerHTML={{
                __html:
                  renderRoleMentionsHtml(panel.embedDescription, panel.roles) ||
                  "No description set.",
              }}
            />

            <div className={styles.rolesList}>
              {panel.roles.map((role) => (
                <div key={role.roleId} className={styles.roleItem}>
                  <span
                    className={styles.roleEmoji}
                    dangerouslySetInnerHTML={{ __html: renderEmojiHtml(role.emoji) }}
                  />
                  <span className={styles.roleLabel}>@{role.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.cardMeta}>
              <p>Channel: {panel.channelId || "Not set"}</p>
              <p>Mode: {panel.selectMode}</p>
            </div>

            <div className={styles.cardActions}>
              <Link
                href={`/dashboard/${guildId}/role-panels/${panel._id}`}
                className={styles.editButton}
              >
                Edit
              </Link>

              <Link
                href={`/dashboard/${guildId}/role-panels/${panel._id}/send`}
                className={styles.primaryButton}
              >
                Send
              </Link>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setDeleteTargetId(panel._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteTargetId && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h3 className={styles.confirmTitle}>Delete role panel?</h3>
            <p className={styles.confirmText}>
              This will permanently delete this role panel. This cannot be undone.
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.editButton}
                onClick={() => setDeleteTargetId(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => {
                  handleDelete(deleteTargetId);
                  setDeleteTargetId(null);
                }}
              >
                Delete Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
