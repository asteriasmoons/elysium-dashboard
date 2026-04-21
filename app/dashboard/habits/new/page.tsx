"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "../habits.module.css";

type HabitFrequency = "daily" | "weekly";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

function getEmojiSrc(emojiId: string, animated?: boolean): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=64&quality=lossless`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEditorHtml(text: string): string {
  const lines = text.split("\n");
  const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;

  return lines
    .map((line) => {
      let lastIndex = 0;
      let html = "";
      let match: RegExpExecArray | null;

      while ((match = emojiRegex.exec(line)) !== null) {
        const [fullMatch, animatedFlag, name, id] = match;
        const start = match.index;

        if (start > lastIndex) {
          html += escapeHtml(line.slice(lastIndex, start));
        }

        const src = getEmojiSrc(id, Boolean(animatedFlag));
        html += `<span contenteditable="false" data-emoji-tag="${escapeHtml(fullMatch)}" style="display:inline-flex;align-items:center;vertical-align:-0.2em;"><img src="${src}" alt=":${escapeHtml(name)}:" title=":${escapeHtml(name)}:" width="22" height="22" style="display:block;" /></span>\u200B`;
        lastIndex = start + fullMatch.length;
      }

      if (lastIndex < line.length) {
        html += escapeHtml(line.slice(lastIndex));
      }

      return html.length > 0 ? `<div>${html}</div>` : `<div><br></div>`;
    })
    .join("");
}

function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u200B/g, "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;

  if (element.tagName === "BR") {
    return "\n";
  }

  const emojiTag = element.getAttribute("data-emoji-tag");
  if (emojiTag) {
    return emojiTag;
  }

  const children = Array.from(element.childNodes)
    .map(serializeEditorNode)
    .join("");

  if (element.tagName === "DIV" || element.tagName === "P") {
    return `${children}\n`;
  }

  return children;
}

function serializeEditorContent(editor: HTMLDivElement): string {
  return Array.from(editor.childNodes)
    .map(serializeEditorNode)
    .join("")
    .replace(/\n+$/g, "");
}

type DiscordEmoji = {
  id: string;
  name: string;
  animated?: boolean;
};

function renderDiscordPreview(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, animatedFlag, name, id] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push(
      <Image
        key={`${id}-${start}-${fullMatch}`}
        src={getEmojiSrc(id, Boolean(animatedFlag))}
        alt={`:${name}:`}
        title={`:${name}:`}
        width={20}
        height={20}
        unoptimized
        style={{
          display: "inline-block",
          verticalAlign: "-0.2em",
          marginRight: 4,
        }}
      />,
    );

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.flatMap((part, index) => {
    if (typeof part !== "string") return part;

    return part.split("\n").flatMap((line, i, arr) => {
      if (i < arr.length - 1) {
        return [line, <br key={`br-${index}-${i}`} />];
      }
      return line;
    });
  });
}

function formatTimePreview(hour: number, minute: number) {
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function NewHabitPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [zone, setZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
  );
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEmojis() {
      try {
        const response = await fetch("/api/emojis");
        if (!response.ok) return;

        const data = await response.json();
        const nextEmojis = Array.isArray(data.emojis) ? data.emojis : [];
        setEmojis(nextEmojis);
      } catch (loadError) {
        console.error(loadError);
      }
    }

    loadEmojis();
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentSerialized = serializeEditorContent(editor);
    if (currentSerialized !== description) {
      editor.innerHTML = renderEditorHtml(description);
    }
  }, [description]);

  function insertEmojiTag(tag: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const next = `${description}${tag}`;
      setDescription(next);
      editor.innerHTML = renderEditorHtml(next);
      setShowEmojiPicker(false);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(tag);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    const nextValue = serializeEditorContent(editor);
    setDescription(nextValue);
    editor.innerHTML = renderEditorHtml(nextValue);
    setShowEmojiPicker(false);
  }

  const scheduleLabel = useMemo(() => {
    if (frequency === "daily") {
      return `Daily at ${formatTimePreview(hour, minute)}`;
    }

    const weekday =
      WEEKDAY_OPTIONS.find((option) => option.value === dayOfWeek)?.label ??
      "Monday";

    return `Weekly on ${weekday} at ${formatTimePreview(hour, minute)}`;
  }, [frequency, dayOfWeek, hour, minute]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          hour,
          minute,
          zone,
          frequency,
          dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create habit");
      }

      router.push("/dashboard/habits");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create habit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>New Habit</h1>
            <p className={styles.subtitle}>
              Create a habit with a schedule that fits your rhythm.
            </p>
          </div>

          <div className={styles.actions}>
            <Link href="/dashboard/habits" className={styles.primaryLink}>
              Back
            </Link>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.cardWide}`}>
          <form onSubmit={handleSubmit} className={styles.formStack}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="title">
                Habit Title
              </label>
              <input
                id="title"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Drink water <:water:123456789012345678>"
                autoComplete="off"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Description</label>

              <div style={{ position: "relative" }}>
                <div
                  ref={editorRef}
                  className={styles.textarea}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    const editor = e.currentTarget;
                    setDescription(serializeEditorContent(editor));
                  }}
                  onBlur={(e) => {
                    const editor = e.currentTarget;
                    setDescription(serializeEditorContent(editor));
                  }}
                  style={{
                    minHeight: 160,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                  }}
                />

                <button
                  type="button"
                  className={styles.emojiButton}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  <Image
                    src="/icons/xsmile.svg"
                    alt="emoji picker"
                    width={20}
                    height={20}
                    unoptimized
                  />
                </button>

                {showEmojiPicker && (
                  <div className={styles.emojiPopover}>
                    {emojis.map((emoji) => {
                      const emojiTag = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;

                      return (
                        <button
                          key={emoji.id}
                          type="button"
                          className={styles.emojiItem}
                          onClick={() => insertEmojiTag(emojiTag)}
                          title={emoji.name}
                        >
                          <Image
                            src={getEmojiSrc(emoji.id, emoji.animated)}
                            alt={emoji.name}
                            width={28}
                            height={28}
                            unoptimized
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.label}>Frequency</span>

              <div className={styles.pillGroup}>
                <button
                  type="button"
                  className={
                    frequency === "daily" ? styles.pillActive : styles.pill
                  }
                  onClick={() => setFrequency("daily")}
                >
                  Daily
                </button>

                <button
                  type="button"
                  className={
                    frequency === "weekly" ? styles.pillActive : styles.pill
                  }
                  onClick={() => setFrequency("weekly")}
                >
                  Weekly
                </button>
              </div>
            </div>

            {frequency === "weekly" && (
              <div className={styles.fieldGroup}>
                <span className={styles.label}>Day of Week</span>

                <div className={styles.pillGroup}>
                  {WEEKDAY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        dayOfWeek === option.value
                          ? styles.pillSmallActive
                          : styles.pillSmall
                      }
                      onClick={() => setDayOfWeek(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.rowFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="hour">
                  Hour
                </label>
                <select
                  id="hour"
                  className={styles.glassSelect}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, value) => (
                    <option key={value} value={value}>
                      {String(value).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="minute">
                  Minute
                </label>
                <select
                  id="minute"
                  className={styles.glassSelect}
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                >
                  {Array.from({ length: 60 }, (_, value) => (
                    <option key={value} value={value}>
                      {String(value).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="zone">
                Time Zone
              </label>
              <input
                id="zone"
                className={styles.input}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="America/Chicago"
                autoComplete="off"
              />
            </div>

            <div className={styles.panel}>
              <div className={styles.cardTop}>
                <h2 className={styles.cardTitle}>Preview</h2>
                <span className={styles.activeBadge}>{scheduleLabel}</span>
              </div>

              {title.trim() ? (
                <p className={styles.cardDescription}>
                  {renderDiscordPreview(title)}
                </p>
              ) : (
                <p className={styles.cardDescriptionMuted}>No title yet</p>
              )}

              {description.trim() ? (
                <p className={styles.cardDescription}>
                  {renderDiscordPreview(description)}
                </p>
              ) : (
                <p className={styles.cardDescriptionMuted}>
                  No description yet
                </p>
              )}

              <p className={styles.cardTime}>{scheduleLabel}</p>
            </div>

            {error ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>{error}</p>
              </div>
            ) : null}

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.deleteButton}
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Habit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
