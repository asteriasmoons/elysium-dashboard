"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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

export default function RolePanelsPage({
  params,
}: {
  params: { guildId: string };
}) {
  const { guildId } = params;

  const [panels, setPanels] = useState<RolePanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        <Link
          href={`/dashboard/${guildId}/role-panels/new`}
          className={styles.primaryButton}
        >
          New Panel
        </Link>
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

            <p className={styles.cardDescription}>
              {panel.embedDescription || "No description set."}
            </p>

            <div className={styles.rolesList}>
              {panel.roles.map((role) => (
                <div key={role.roleId} className={styles.roleItem}>
                  <span className={styles.roleEmoji}>{role.emoji || "•"}</span>
                  <span className={styles.roleLabel}>{role.label}</span>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
