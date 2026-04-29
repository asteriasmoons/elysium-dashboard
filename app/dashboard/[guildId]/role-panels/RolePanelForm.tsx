"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import EmojiPicker, { type DiscordEmoji } from "@/components/discord/EmojiPicker";
import RenderDiscordText from "@/components/discord/RenderDiscordText";
import RoleMentionPicker from "@/components/discord/RoleMentionPicker";
import {
  insertDiscordEmojiTagIntoEditor,
  serializeDiscordEditorContent,
  syncDiscordEditorContent,
} from "@/lib/discordEmojiEditor";
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
  const titleEditorRef = useRef<HTMLDivElement | null>(null);
  const descriptionEditorRef = useRef<HTMLDivElement | null>(null);
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
  const [activeEmbedEmojiField, setActiveEmbedEmojiField] = useState<
    "title" | "description" | null
  >(null);
  const [showRoleMentionPicker, setShowRoleMentionPicker] = useState(false);
  const [roleMentionSearch, setRoleMentionSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const postChannels = channels.filter((channel) => {
    if (channel.type === undefined || channel.type === null) return true;

    const type = Number(channel.type);
    return type === 0 || type === 5 || type === 15;
  });

  const mentionableRoles = guildRoles.filter((role) => {
    const query = roleMentionSearch.trim().toLowerCase();
    if (!query) return true;
    return role.name.toLowerCase().includes(query);
  });

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

        const nextPostChannels = nextChannels.filter((channel) => {
          if (channel.type === undefined || channel.type === null) return true;

          const type = Number(channel.type);
          return type === 0 || type === 5 || type === 15;
        });

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

  useEffect(() => {
    syncDiscordEditorContent(titleEditorRef.current, embedTitle);
  }, [embedTitle]);

  useEffect(() => {
    syncDiscordEditorContent(descriptionEditorRef.current, embedDescription);
  }, [embedDescription]);

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

  function insertEmbedEmoji(emoji: string) {
    if (activeEmbedEmojiField === "title") {
      insertDiscordEmojiTagIntoEditor(
        titleEditorRef.current,
        embedTitle,
        setEmbedTitle,
        emoji,
        () => setActiveEmbedEmojiField(null),
      );
      return;
    }

    if (activeEmbedEmojiField === "description") {
      insertDiscordEmojiTagIntoEditor(
        descriptionEditorRef.current,
        embedDescription,
        setEmbedDescription,
        emoji,
        () => setActiveEmbedEmojiField(null),
      );
    }
  }

  function handleDescriptionEditorInput(editor: HTMLDivElement) {
    const nextValue = serializeDiscordEditorContent(editor);
    setEmbedDescription(nextValue);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowRoleMentionPicker(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!descriptionEditorRef.current?.contains(range.commonAncestorContainer)) {
      setShowRoleMentionPicker(false);
      return;
    }

    const textBeforeCursor = range.startContainer.textContent?.slice(0, range.startOffset) ?? "";
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_ -]*)$/);

    if (!mentionMatch) {
      setShowRoleMentionPicker(false);
      setRoleMentionSearch("");
      return;
    }

    setActiveEmbedEmojiField(null);
    setRoleMentionSearch(mentionMatch[1] ?? "");
    setShowRoleMentionPicker(true);
  }

  function insertRoleMention(role: GuildRole) {
    const editor = descriptionEditorRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setEmbedDescription((current) => `${current}<@&${role.id}>`);
      setShowRoleMentionPicker(false);
      setRoleMentionSearch("");
      return;
    }

    const range = selection.getRangeAt(0);

    if (!editor.contains(range.commonAncestorContainer)) {
      setEmbedDescription((current) => `${current}<@&${role.id}>`);
      setShowRoleMentionPicker(false);
      setRoleMentionSearch("");
      return;
    }

    const containerText = range.startContainer.textContent ?? "";
    const beforeCursor = containerText.slice(0, range.startOffset);
    const mentionMatch = beforeCursor.match(/@([a-zA-Z0-9_ -]*)$/);

    if (mentionMatch) {
      range.setStart(range.startContainer, range.startOffset - mentionMatch[0].length);
    }

    range.deleteContents();

    const mentionNode = document.createTextNode(`<@&${role.id}>`);
    range.insertNode(mentionNode);
    range.setStartAfter(mentionNode);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    const nextValue = serializeDiscordEditorContent(editor);
    setEmbedDescription(nextValue);
    setShowRoleMentionPicker(false);
    setRoleMentionSearch("");
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

          <div className={styles.fieldGroup} style={{ position: "relative" }}>
            <label className={styles.label}>Embed Title</label>

            <div
              ref={titleEditorRef}
              contentEditable
              suppressContentEditableWarning
              className={styles.input}
              onFocus={() => setActiveEmbedEmojiField("title")}
              onInput={(e) =>
                setEmbedTitle(serializeDiscordEditorContent(e.currentTarget))
              }
              onBlur={(e) =>
                setEmbedTitle(serializeDiscordEditorContent(e.currentTarget))
              }
              style={{
                minHeight: 44,
                paddingRight: 48,
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
            />

            <button
              type="button"
              className={`${styles.emojiButton} ${styles.inputEmojiButton}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                setActiveEmbedEmojiField((current) =>
                  current === "title" ? null : "title",
                )
              }
            >
              <Image
                src="/img/icons/face.svg"
                alt="emoji picker"
                width={20}
                height={20}
                unoptimized
              />
            </button>

            {activeEmbedEmojiField === "title" && (
              <EmojiPicker
                emojis={emojis}
                onPick={insertEmbedEmoji}
                className={styles.emojiPopover}
                itemClassName={styles.emojiItem}
              />
            )}
          </div>

          <div className={styles.fieldGroup} style={{ position: "relative" }}>
            <label className={styles.label}>Embed Description</label>

            <div
              ref={descriptionEditorRef}
              contentEditable
              suppressContentEditableWarning
              className={styles.textarea}
              onFocus={() => setActiveEmbedEmojiField("description")}
              onInput={(e) => handleDescriptionEditorInput(e.currentTarget)}
              onBlur={(e) =>
                setEmbedDescription(serializeDiscordEditorContent(e.currentTarget))
              }
              style={{
                paddingRight: 48,
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
            />

            <button
              type="button"
              className={`${styles.emojiButton} ${styles.textareaEmojiButton}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowRoleMentionPicker(false);
                setActiveEmbedEmojiField((current) =>
                  current === "description" ? null : "description",
                );
              }}
            >
              <Image
                src="/img/icons/face.svg"
                alt="emoji picker"
                width={20}
                height={20}
                unoptimized
              />
            </button>

            {activeEmbedEmojiField === "description" && (
              <EmojiPicker
                emojis={emojis}
                onPick={insertEmbedEmoji}
                className={styles.emojiPopover}
                itemClassName={styles.emojiItem}
              />
            )}

            {showRoleMentionPicker && (
              <RoleMentionPicker
                roles={mentionableRoles}
                search={roleMentionSearch}
                onPick={insertRoleMention}
                className={styles.roleMentionPopover}
                itemClassName={styles.roleMentionItem}
              />
            )}
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
                        onClick={() => {
                          setActiveEmbedEmojiField(null);
                          setActiveEmojiIndex((current) =>
                            current === index ? null : index,
                          );
                        }}
                      > 
                        <Image
                          src="/img/icons/face.svg"
                          alt="emoji picker"
                          width={20}
                          height={20}
                          unoptimized
                        />
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
