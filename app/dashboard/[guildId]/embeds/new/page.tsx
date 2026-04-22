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
    .replace(/"/g, "&quot;")
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
        html += `<span contenteditable="false" data-emoji-tag="${escapeHtml(
          fullMatch,
        )}" style="display:inline-flex;align-items:center;vertical-align:-0.2em;"><img src="${src}" alt=":${escapeHtml(
          name,
        )}:" title=":${escapeHtml(
          name,
        )}:" width="22" height="22" style="display:block;" /></span>\u200B`;
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

        <form onSubmit={handleSubmit}>
          <div className={styles.builderLayout}>
            <div className={styles.builderPanel}>
              <div className={styles.card}>
                <div className={styles.formStack}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Name</label>
                    <input
                      className={styles.input}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="rules1"
                    />
                  </div>

                  <div
                    className={styles.fieldGroup}
                    style={{ position: "relative" }}
                  >
                    <label className={styles.label}>Embed Title</label>
                    <div
                      ref={titleEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className={styles.input}
                      onFocus={() => setActiveEditor("title")}
                      onInput={(e) =>
                        setTitle(serializeEditorContent(e.currentTarget))
                      }
                      onBlur={(e) =>
                        setTitle(serializeEditorContent(e.currentTarget))
                      }
                      style={{
                        minHeight: 54,
                        paddingRight: 42,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "break-word",
                      }}
                    />

                    <button
                      type="button"
                      className={styles.emojiButton}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setActiveEditor("title");
                        setShowEmojiPicker((prev) => !prev);
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

                  <div
                    className={styles.fieldGroup}
                    style={{ position: "relative" }}
                  >
                    <label className={styles.label}>Description</label>
                    <div
                      ref={descriptionEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className={styles.textarea}
                      onFocus={() => setActiveEditor("description")}
                      onInput={(e) =>
                        setDescription(serializeEditorContent(e.currentTarget))
                      }
                      onBlur={(e) =>
                        setDescription(serializeEditorContent(e.currentTarget))
                      }
                      style={{
                        paddingRight: 42,
                      }}
                    />

                    <button
                      type="button"
                      className={styles.emojiButton}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setActiveEditor("description");
                        setShowEmojiPicker((prev) => !prev);
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
                        className={styles.emojiPopover}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {emojis.map((emoji) => {
                          const emojiTag = `<${
                            emoji.animated ? "a" : ""
                          }:${emoji.name}:${emoji.id}>`;

                          return (
                            <button
                              key={emoji.id}
                              type="button"
                              className={styles.emojiItem}
                              onMouseDown={(e) => e.preventDefault()}
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

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Color</label>
                    <input
                      className={styles.input}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#5865F2"
                    />
                  </div>

                  <div className={styles.rowFields}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Author Name</label>
                      <input
                        className={styles.input}
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Author Icon URL</label>
                      <input
                        className={styles.input}
                        value={authorIconUrl}
                        onChange={(e) => setAuthorIconUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.rowFields}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Footer Text</label>
                      <input
                        className={styles.input}
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Footer Icon URL</label>
                      <input
                        className={styles.input}
                        value={footerIconUrl}
                        onChange={(e) => setFooterIconUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={footerTimestamp}
                      onChange={(e) => setFooterTimestamp(e.target.checked)}
                    />
                    Footer Timestamp
                  </label>

                  <div className={styles.rowFields}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Thumbnail URL</label>
                      <input
                        className={styles.input}
                        value={thumbnail}
                        onChange={(e) => setThumbnail(e.target.value)}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Image URL</label>
                      <input
                        className={styles.input}
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.previewPanel}>
              <div className={styles.previewCard}>
                <p className={styles.previewLabel}>Preview</p>

                <div className={styles.discordPreviewShell}>
                  <div
                    className={styles.discordEmbed}
                    style={{ borderLeftColor: color || "#5865F2" }}
                  >
                    <div className={styles.discordEmbedInner}>
                      {authorName && (
                        <div className={styles.embedAuthorRow}>
                          {authorIconUrl && (
                            <Image
                              className={styles.embedAuthorIcon}
                              src={authorIconUrl}
                              alt=""
                              width={20}
                              height={20}
                              unoptimized
                            />
                          )}
                          <span className={styles.embedAuthorName}>
                            {authorName}
                          </span>
                        </div>
                      )}

                      <div className={styles.embedBodyRow}>
                        <div className={styles.embedMain}>
                          {title && (
                            <p className={styles.previewTitle}>
                              {renderDiscordPreview(title)}
                            </p>
                          )}

                          {description ? (
                            <p className={styles.previewDescription}>
                              {renderDiscordPreview(description)}
                            </p>
                          ) : (
                            <p className={styles.previewMuted}>
                              No description
                            </p>
                          )}
                        </div>

                        {thumbnail && (
                          <Image
                            className={styles.embedThumbnail}
                            src={thumbnail}
                            alt=""
                            width={80}
                            height={80}
                            unoptimized
                          />
                        )}
                      </div>

                      {image && (
                        <Image
                          className={styles.embedImage}
                          src={image}
                          alt=""
                          width={400}
                          height={240}
                          unoptimized
                        />
                      )}

                      {(footerText || footerTimestamp) && (
                        <div className={styles.embedFooterRow}>
                          {footerIconUrl && (
                            <Image
                              className={styles.embedFooterIcon}
                              src={footerIconUrl}
                              alt=""
                              width={20}
                              height={20}
                              unoptimized
                            />
                          )}
                          <span className={styles.embedFooterText}>
                            {footerText}
                            {footerTimestamp
                              ? `${footerText ? " • " : ""}${new Date().toLocaleString()}`
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && <p className={styles.emptyText}>{error}</p>}

          <div className={`${styles.formActions} ${styles.spacingLg}`}>
            <button type="submit" className={styles.editLink} disabled={saving}>
              {saving ? "Saving..." : "Create Embed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}