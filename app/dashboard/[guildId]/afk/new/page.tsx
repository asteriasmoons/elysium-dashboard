"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import EmojiPicker, {
  type DiscordEmoji,
} from "@/components/discord/EmojiPicker";
import RenderDiscordText from "@/components/discord/RenderDiscordText";
import {
  insertDiscordEmojiTagIntoEditor,
  serializeDiscordEditorContent,
  syncDiscordEditorContent,
} from "@/lib/discordEmojiEditor";
import styles from "../afk.module.css";

type AfkConfig = {
  guildId: string;
  enabled: boolean;
  noticeTitle: string;
  noticeColor: string;
  defaultMessage: string;
};

const DEFAULT_AFK_CONFIG: AfkConfig = {
  guildId: "",
  enabled: true,
  noticeTitle: "AFK Notice",
  noticeColor: "#58b2f2",
  defaultMessage: "I am currently AFK.",
};

export default function AfkPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = String(params.guildId);

  const messageEditorRef = useRef<HTMLDivElement | null>(null);

  const [config, setConfig] = useState<AfkConfig>({
    ...DEFAULT_AFK_CONFIG,
    guildId,
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAfkConfig() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/guilds/${guildId}/afk`);
        const data: { config?: AfkConfig; error?: string } = await response.json();

        if (!response.ok || !data.config) {
          throw new Error(data.error || "Failed to load AFK settings.");
        }

        setConfig(data.config);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load AFK settings.");
      } finally {
        setLoading(false);
      }
    }

    loadAfkConfig();
  }, [guildId]);

  useEffect(() => {
    async function loadEmojis() {
      try {
        const response = await fetch("/api/emojis");
        if (!response.ok) return;

        const data: { emojis?: DiscordEmoji[] } = await response.json();
        setEmojis(Array.isArray(data.emojis) ? data.emojis : []);
      } catch (err) {
        console.error(err);
      }
    }

    loadEmojis();
  }, []);

  useEffect(() => {
    syncDiscordEditorContent(messageEditorRef.current, config.defaultMessage);
  }, [config.defaultMessage]);

  function updateField<K extends keyof AfkConfig>(field: K, value: AfkConfig[K]) {
    setConfig((current) => ({
      ...current,
      [field]: value,
    }));
    setSaved(false);
  }

  function updateMessageFromEditor() {
    if (!messageEditorRef.current) return;
    updateField("defaultMessage", serializeDiscordEditorContent(messageEditorRef.current));
  }

  function insertEmojiTag(tag: string) {
    insertDiscordEmojiTagIntoEditor(
      messageEditorRef.current,
      config.defaultMessage,
      (value) => updateField("defaultMessage", value),
      tag,
      () => setShowEmojiPicker(false),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const response = await fetch(`/api/guilds/${guildId}/afk`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: config.enabled,
          noticeTitle: config.noticeTitle,
          noticeColor: config.noticeColor,
          defaultMessage: config.defaultMessage,
        }),
      });

      const data: { config?: AfkConfig; error?: string } = await response.json();

      if (!response.ok || !data.config) {
        throw new Error(data.error || "Failed to save AFK settings.");
      }

      setConfig(data.config);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save AFK settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>AFK Settings</h1>
            <p className={styles.subtitle}>
              Configure the AFK system, server message, and Discord-style notice preview.
            </p>
          </div>

          <div className={styles.actions}>
            <Link href={`/dashboard/${guildId}`} className={styles.primaryLink}>
              Back
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.builderLayout}>
            <div className={styles.builderPanel}>
              <div className={styles.card}>
                {loading ? (
                  <p className={styles.emptyText}>Loading AFK settings...</p>
                ) : (
                  <div className={styles.formStack}>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updateField("enabled", e.target.checked)}
                      />
                      Enable AFK System
                    </label>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Notice Title</label>
                      <input
                        className={styles.input}
                        value={config.noticeTitle}
                        onChange={(e) => updateField("noticeTitle", e.target.value)}
                        placeholder="AFK Notice"
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Notice Color</label>
                      <input
                        className={styles.input}
                        value={config.noticeColor}
                        onChange={(e) => updateField("noticeColor", e.target.value)}
                        placeholder="#58b2f2"
                      />
                    </div>

                    <div className={styles.fieldGroup} style={{ position: "relative" }}>
                      <label className={styles.label}>AFK Message</label>
                      <div
                        ref={messageEditorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className={styles.textarea}
                        onInput={updateMessageFromEditor}
                        onBlur={updateMessageFromEditor}
                        style={{ paddingRight: 42 }}
                      />

                      <button
                        type="button"
                        className={styles.emojiButton}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                      >
                        <Image
                          src="/img/icons/face.svg"
                          alt="emoji picker"
                          width={20}
                          height={20}
                          unoptimized
                        />
                      </button>

                      {showEmojiPicker && (
                        <div
                          className={styles.emojiPopover}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <EmojiPicker
                            emojis={emojis}
                            onPick={insertEmojiTag}
                            itemClassName={styles.emojiItem}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.previewPanel}>
              <div className={styles.previewCard}>
                <p className={styles.previewLabel}>Preview</p>

                <div className={styles.discordPreviewShell}>
                  <div
                    className={styles.discordEmbed}
                    style={{ borderLeftColor: config.noticeColor || "#58b2f2" }}
                  >
                    <div className={styles.discordEmbedInner}>
                      <p className={styles.previewTitle}>
                        {config.noticeTitle || "AFK Notice"}
                      </p>

                      <p className={styles.previewDescription}>
                        @AFK User is currently AFK.
                      </p>

                      <p className={styles.previewDescription}>
                        <strong>Message:</strong>
                        <br />
                        <RenderDiscordText text={config.defaultMessage || "I am currently AFK."} />
                      </p>

                      <p className={styles.previewMuted}>Since: a few minutes ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && <p className={styles.emptyText}>{error}</p>}
          {saved && <p className={styles.emptyText}>Saved.</p>}

          <div className={`${styles.formActions} ${styles.spacingLg}`}>
            <button type="submit" className={styles.editLink} disabled={saving || loading}>
              {saving ? "Saving..." : "Save AFK Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
