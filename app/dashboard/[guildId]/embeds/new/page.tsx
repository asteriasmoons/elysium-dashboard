"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import styles from "../embeds.module.css";

type DiscordEmoji = {
  id: string;
  name: string;
  animated?: boolean;
};

type ActiveEditor = "title" | "description" | null;

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

export default function NewEmbedPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = String(params.guildId);
  const router = useRouter();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#5865F2");
  const [authorName, setAuthorName] = useState("");
  const [authorIconUrl, setAuthorIconUrl] = useState("");
  const [footerText, setFooterText] = useState("");
  const [footerIconUrl, setFooterIconUrl] = useState("");
  const [footerTimestamp, setFooterTimestamp] = useState(false);
  const [thumbnail, setThumbnail] = useState("");
  const [image, setImage] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);

  const titleEditorRef = useRef<HTMLDivElement | null>(null);
  const descriptionEditorRef = useRef<HTMLDivElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEmojis() {
      try {
        const response = await fetch("/api/emojis");
        if (!response.ok) return;
        const data = await response.json();
        setEmojis(Array.isArray(data.emojis) ? data.emojis : []);
      } catch (err) {
        console.error(err);
      }
    }

    loadEmojis();
  }, []);

  useEffect(() => {
    const editor = titleEditorRef.current;
    if (!editor) return;
    const currentSerialized = serializeEditorContent(editor);
    if (currentSerialized !== title) {
      editor.innerHTML = renderEditorHtml(title);
    }
  }, [title]);

  useEffect(() => {
    const editor = descriptionEditorRef.current;
    if (!editor) return;
    const currentSerialized = serializeEditorContent(editor);
    if (currentSerialized !== description) {
      editor.innerHTML = renderEditorHtml(description);
    }
  }, [description]);

  function insertEmojiTag(tag: string) {
    const editor =
      activeEditor === "title"
        ? titleEditorRef.current
        : descriptionEditorRef.current;

    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      if (activeEditor === "title") {
        const next = `${title}${tag}`;
        setTitle(next);
        editor.innerHTML = renderEditorHtml(next);
      } else {
        const next = `${description}${tag}`;
        setDescription(next);
        editor.innerHTML = renderEditorHtml(next);
      }
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

    if (activeEditor === "title") {
      setTitle(nextValue);
    } else {
      setDescription(nextValue);
    }

    editor.innerHTML = renderEditorHtml(nextValue);
    setShowEmojiPicker(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/embeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guildId,
          name,
          title: title || null,
          description: description || null,
          color: color || null,
          author: {
            name: authorName,
            icon_url: authorIconUrl,
          },
          footer: {
            text: footerText,
            icon_url: footerIconUrl,
            timestamp: footerTimestamp,
          },
          thumbnail,
          image,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create embed");
      }

      router.push(`/dashboard/${guildId}/embeds`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create embed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>New Embed</h1>
            <p className={styles.subtitle}>
              Build a saved embed and preview it live.
            </p>
          </div>

          <div className={styles.actions}>
            <Link
              href={`/dashboard/${guildId}/embeds`}
              className={styles.primaryLink}
            >
              Back
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div className={styles.card}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="rules1"
                  style={{ width: "100%", marginTop: 6 }}
                />
              </div>

              <div style={{ position: "relative" }}>
                <label>Embed Title</label>
                <div
                  ref={titleEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => setActiveEditor("title")}
                  onInput={(e) =>
                    setTitle(serializeEditorContent(e.currentTarget))
                  }
                  onBlur={(e) =>
                    setTitle(serializeEditorContent(e.currentTarget))
                  }
                  style={{
                    minHeight: 54,
                    marginTop: 6,
                    padding: "12px 42px 12px 12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    background: "#0a0c1c",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                  }}
                />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setActiveEditor("title");
                    setShowEmojiPicker((prev) => !prev);
                  }}
                  style={{
                    position: "absolute",
                    right: 10,
                    bottom: 10,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: 6,
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

              <div style={{ position: "relative" }}>
                <label>Description</label>
                <div
                  ref={descriptionEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => setActiveEditor("description")}
                  onInput={(e) =>
                    setDescription(serializeEditorContent(e.currentTarget))
                  }
                  onBlur={(e) =>
                    setDescription(serializeEditorContent(e.currentTarget))
                  }
                  style={{
                    minHeight: 180,
                    marginTop: 6,
                    padding: "12px 42px 12px 12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    background: "#0a0c1c",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                  }}
                />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setActiveEditor("description");
                    setShowEmojiPicker((prev) => !prev);
                  }}
                  style={{
                    position: "absolute",
                    right: 10,
                    bottom: 10,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: 6,
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

                {showEmojiPicker && (
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      zIndex: 50,
                      background: "#0b0f1f",
                      borderRadius: 12,
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "repeat(6, 1fr)",
                      gap: 8,
                      width: 320,
                      maxHeight: 300,
                      overflowY: "auto",
                    }}
                  >
                    {emojis.map((emoji) => {
                      const emojiTag = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;

                      return (
                        <button
                          key={emoji.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => insertEmojiTag(emojiTag)}
                          title={emoji.name}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 4,
                          }}
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

              <div>
                <label>Color</label>
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#5865F2"
                  style={{ width: "100%", marginTop: 6 }}
                />
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label>Author Name</label>
                  <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </div>

                <div>
                  <label>Author Icon URL</label>
                  <input
                    value={authorIconUrl}
                    onChange={(e) => setAuthorIconUrl(e.target.value)}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </div>

                <div>
                  <label>Footer Text</label>
                  <input
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </div>

                <div>
                  <label>Footer Icon URL</label>
                  <input
                    value={footerIconUrl}
                    onChange={(e) => setFooterIconUrl(e.target.value)}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </div>

                <label
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={footerTimestamp}
                    onChange={(e) => setFooterTimestamp(e.target.checked)}
                  />
                  Footer Timestamp
                </label>

                <div>
                  <label>Thumbnail URL</label>
                  <input
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </div>

                <div>
                  <label>Image URL</label>
                  <input
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    style={{ width: "100%", marginTop: 6 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTop}>
              <h2 className={styles.cardTitle}>Preview</h2>
            </div>

            <div className={styles.discordPreviewShell}>
              <div
                className={styles.discordEmbed}
                style={{ borderLeftColor: color || "#5865F2" }}
              >
                <div className={styles.discordEmbedInner}>
                  {authorName ? (
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: 12,
                        color: "#ffffff",
                      }}
                    >
                      {authorName}
                    </p>
                  ) : null}

                  {title ? (
                    <p className={styles.previewTitle}>
                      {renderDiscordPreview(title)}
                    </p>
                  ) : null}

                  {description ? (
                    <p className={styles.previewDescription}>
                      {renderDiscordPreview(description)}
                    </p>
                  ) : (
                    <p className={styles.previewMuted}>No description</p>
                  )}

                  {footerText ? (
                    <p
                      style={{ marginTop: 10, fontSize: 12, color: "#949ba4" }}
                    >
                      {footerText}
                      {footerTimestamp
                        ? ` • ${new Date().toLocaleString()}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {error ? <p className={styles.emptyText}>{error}</p> : null}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className={styles.editLink} disabled={saving}>
              {saving ? "Saving..." : "Create Embed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
