"use client";

import { useEffect, useState } from "react";
import EmojiPicker, { type DiscordEmoji } from "@/components/discord/EmojiPicker";
import RenderDiscordText from "@/components/discord/RenderDiscordText";
import { useRouter } from "next/navigation";
import styles from "./role-panels.module.css";

type Mode = "create" | "edit";

type GuildRole = {
  id: string;
  name: string;
  color?: string;
  position?: number;
};

type GuildChannel = {
  id: string;
  name: string;
  type?: number;
};

type PanelRole = {
  roleId: string;
  label: string;
  emoji: string | null;
  description: string | null;
  order: number;
};

type RolePanelData = {
  _id?: string;
  panelName: string;
  type: "select" | "buttons";
  selectMode: "single" | "multiple";
  roles: PanelRole[];
  channelId: string | null;
  messageId: string | null;
  embedTitle: string | null;
  embedDescription: string | null;
  embedColor: string;
};

type Props = {
  guildId: string;
  mode: Mode;
  panelId?: string;
  initialPanel?: RolePanelData | null;
};

const emptyRole: PanelRole = {
  roleId: "",
  label: "",
  emoji: "",
  description: "",
  order: 0,
};

export default function RolePanelForm({
  guildId,
  mode,
  panelId,
  initialPanel,
}: Props) {
  const router = useRouter();
  const safeGuildId = String(guildId ?? "").trim();

  const [guildRoles, setGuildRoles] = useState<GuildRole[]>([]);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [panelName, setPanelName] = useState(initialPanel?.panelName ?? "");
  const [type, setType] = useState<"select" | "buttons">(
    initialPanel?.type ?? "select",
  );
  const [selectMode, setSelectMode] = useState<"single" | "multiple">(
    initialPanel?.selectMode ?? "single",
  );
  const [channelId, setChannelId] = useState(initialPanel?.channelId ?? "");
  const [embedTitle, setEmbedTitle] = useState(initialPanel?.embedTitle ?? "");
  const [embedDescription, setEmbedDescription] = useState(
    initialPanel?.embedDescription ?? "",
  );
  const [embedColor, setEmbedColor] = useState(
    initialPanel?.embedColor ?? "#00bfff",
  );
  const [roles, setRoles] = useState<PanelRole[]>(
    initialPanel?.roles?.length ? initialPanel.roles : [{ ...emptyRole }],
  );

  const [activeEmojiIndex, setActiveEmojiIndex] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const postChannels = channels.filter((channel) =>
    [0, 5, 15].includes(Number(channel.type)),
  );

  useEffect(() => {
    async function loadOptions() {
      try {
        setError("");
        if (!safeGuildId) {
          throw new Error("Missing guild ID");
        }

        const [channelsRes, rolesRes, emojiRes] = await Promise.all([
          fetch(`/api/guilds/${safeGuildId}/channels`),
          fetch(`/api/guilds/${safeGuildId}/roles`),
          fetch("/api/emojis"),
        ]);

        const channelsData = await channelsRes.json();
        const rolesData = await rolesRes.json();
        const emojiData = await emojiRes.json();

        if (!channelsRes.ok) {
          throw new Error(channelsData?.error || "Failed to load channels");
        }

        if (!rolesRes.ok) {
          throw new Error(rolesData?.error || "Failed to load roles");
        }

        if (!emojiRes.ok) {
          throw new Error(emojiData?.error || "Failed to load emojis");
        }

        const nextChannels: GuildChannel[] = Array.isArray(channelsData.channels)
          ? channelsData.channels
          : [];
        const nextRoles: GuildRole[] = Array.isArray(rolesData.roles)
          ? rolesData.roles
          : [];
        const nextEmojis: DiscordEmoji[] = Array.isArray(emojiData.emojis)
          ? emojiData.emojis
          : [];

        const nextPostChannels = nextChannels.filter((channel) =>
          [0, 5, 15].includes(Number(channel.type)),
        );

        setChannels(nextChannels);
        setGuildRoles(nextRoles);
        setEmojis(nextEmojis);
        setChannelId((current) => current || nextPostChannels[0]?.id || "");
      } catch (err) {
        setChannels([]);
        setGuildRoles([]);
        setEmojis([]);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard options",
        );
      }
    }

    loadOptions();
  }, [safeGuildId]);

  function updateRole(index: number, patch: Partial<PanelRole>) {
    setRoles((current) =>
      current.map((role, roleIndex) =>
        roleIndex === index ? { ...role, ...patch } : role,
      ),
    );
  }

  function addRole() {
    setRoles((current) => [
      ...current,
      {
        ...emptyRole,
        order: current.length,
      },
    ]);
  }

  function removeRole(index: number) {
    setRoles((current) =>
      current
        .filter((_, roleIndex) => roleIndex !== index)
        .map((role, roleIndex) => ({
          ...role,
          order: roleIndex,
        })),
    );
  }

  function applyPickedRole(index: number, roleId: string) {
    const picked = guildRoles.find((role) => role.id === roleId);

    updateRole(index, {
      roleId,
      label: picked?.name ?? "",
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const cleanedRoles = roles
        .map((role, index) => ({
          roleId: role.roleId.trim(),
          label: role.label.trim(),
          emoji: role.emoji?.trim() || null,
          description: role.description?.trim() || null,
          order: index,
        }))
        .filter((role) => role.roleId && role.label);

      const payload = {
        guildId: safeGuildId,
        panelName,
        type,
        selectMode,
        roles: cleanedRoles,
        channelId: channelId || null,
        messageId: initialPanel?.messageId ?? null,
        embedTitle: embedTitle || null,
        embedDescription: embedDescription || null,
        embedColor: embedColor || "#00bfff",
      };

      const res = await fetch(
        mode === "edit" && panelId
          ? `/api/role-panels/${panelId}?guildId=${safeGuildId}`
          : "/api/role-panels",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save role panel");
      }

      router.push(`/dashboard/${safeGuildId}/role-panels`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save panel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {mode === "edit" ? "Edit Role Panel" : "New Role Panel"}
          </h1>
          <p className={styles.subtitle}>
            Build a role panel with selectable server roles.
          </p>
        </div>

        <button
          type="button"
          className={styles.editButton}
          onClick={() => router.push(`/dashboard/${safeGuildId}/role-panels`)}
        >
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.formStack}>
        <div className={styles.card}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Panel Name</label>
            <input
              className={styles.input}
              value={panelName}
              onChange={(e) => setPanelName(e.target.value)}
              placeholder="age"
            />
          </div>

          <div className={styles.rowFields}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Panel Type</label>
              <select
                className={styles.glassSelect}
                value={type}
                onChange={(e) =>
                  setType(e.target.value === "buttons" ? "buttons" : "select")
                }
              >
                <option value="select">Select Menu</option>
                <option value="buttons">Buttons</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Select Mode</label>
              <select
                className={styles.glassSelect}
                value={selectMode}
                onChange={(e) =>
                  setSelectMode(
                    e.target.value === "multiple" ? "multiple" : "single",
                  )
                }
              >
                <option value="single">Single Role</option>
                <option value="multiple">Multiple Roles</option>
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Post Channel</label>
            <select
              className={styles.glassSelect}
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            >
              <option value="">Choose channel</option>
              {postChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Embed Content</h2>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Embed Title</label>
            <input
              className={styles.input}
              value={embedTitle}
              onChange={(e) => setEmbedTitle(e.target.value)}
              placeholder="Age Roles!"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Embed Description</label>
            <textarea
              className={styles.textarea}
              value={embedDescription}
              onChange={(e) => setEmbedDescription(e.target.value)}
              placeholder="React to this message to get a role!"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Embed Color</label>
            <input
              className={styles.input}
              value={embedColor}
              onChange={(e) => setEmbedColor(e.target.value)}
              placeholder="#00bfff"
            />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Role Options</h2>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={addRole}
            >
              Add Role
            </button>
          </div>

          <div className={styles.roleBuilderList}>
            {roles.map((role, index) => (
              <div key={index} className={styles.roleBuilderItem}>
                <div className={styles.rowFields}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Server Role</label>
                    <select
                      className={styles.glassSelect}
                      value={role.roleId}
                      onChange={(e) => applyPickedRole(index, e.target.value)}
                    >
                      <option value="">Choose role</option>
                      {guildRoles.map((guildRole) => (
                        <option key={guildRole.id} value={guildRole.id}>
                          @{guildRole.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Display Label</label>
                    <input
                      className={styles.input}
                      value={role.label}
                      onChange={(e) =>
                        updateRole(index, { label: e.target.value })
                      }
                      placeholder="Over 18"
                    />
                  </div>
                </div>

                <div className={styles.rowFields}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Emoji</label>
                    <div className={styles.emojiRow}>
                      <input
                        className={styles.input}
                        value={role.emoji ?? ""}
                        onChange={(e) =>
                          updateRole(index, { emoji: e.target.value })
                        }
                        placeholder="<:emoji:123456789>"
                      />

                      <button
                        type="button"
                        className={styles.emojiButton}
                        onClick={() =>
                          setActiveEmojiIndex((current) =>
                            current === index ? null : index,
                          )
                        }
                      >
                        Pick
                      </button>
                    </div>

                    {role.emoji ? (
                      <p className={styles.emojiPreview}>
                        Preview: <RenderDiscordText text={role.emoji} />
                      </p>
                    ) : null}

                    {activeEmojiIndex === index && (
                      <EmojiPicker
                        emojis={emojis}
                        onPick={(emoji) => {
                          updateRole(index, { emoji });
                          setActiveEmojiIndex(null);
                        }}
                        className={styles.emojiPopover}
                        itemClassName={styles.emojiItem}
                      />
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Description</label>
                    <input
                      className={styles.input}
                      value={role.description ?? ""}
                      onChange={(e) =>
                        updateRole(index, { description: e.target.value })
                      }
                      placeholder="Optional role description"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => removeRole(index)}
                >
                  Remove Role
                </button>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>{error}</p>
          </div>
        ) : null}

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Panel"}
          </button>
        </div>
      </form>
    </div>
  );
}
