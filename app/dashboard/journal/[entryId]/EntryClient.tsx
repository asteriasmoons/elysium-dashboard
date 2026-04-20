"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./entry.module.css";

type ApiResponse = { ok: true } | { error: string };

type DiscordEmoji = {
  id: string;
  name: string;
  animated?: boolean;
};

function getErrorMessage(value: unknown): string {
  if (value && typeof value === "object" && "error" in value) {
    const v = value as { error?: unknown };
    if (typeof v.error === "string") return v.error;
  }
  return "Something went wrong.";
}

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

export default function EntryClient({
  entryId,
  initialTitle,
  initialEntry,
  createdAt,
}: {
  entryId: string;
  initialTitle: string;
  initialEntry: string;
  createdAt: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [entry, setEntry] = useState(initialEntry);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const backUrl = "/dashboard/journal";

  useEffect(() => {
    async function loadEmojis() {
      try {
        const response = await fetch("/api/emojis");
        if (!response.ok) return;

        const data = await response.json();
        const nextEmojis = Array.isArray(data.emojis) ? data.emojis : [];
        setEmojis(nextEmojis);
      } catch (err) {
        console.error(err);
      }
    }

    loadEmojis();
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentSerialized = serializeEditorContent(editor);
    if (currentSerialized !== entry) {
      editor.innerHTML = renderEditorHtml(entry);
    }
  }, [entry]);

  function handleEditorInput() {
    const editor = editorRef.current;
    if (!editor) return;
    setEntry(serializeEditorContent(editor));
  }

  function insertEmoji(emoji: DiscordEmoji) {
    const tag = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
    const editor = editorRef.current;

    if (!editor) {
      setEntry((prev) => prev + tag);
      setShowEmojiPicker(false);
      return;
    }

    editor.focus();

    const selection = window.getSelection();
    let range: Range;

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if (!editor.contains(range.startContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    range.deleteContents();

    const span = document.createElement("span");
    span.setAttribute("contenteditable", "false");
    span.setAttribute("data-emoji-tag", tag);
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.verticalAlign = "-0.2em";

    const img = document.createElement("img");
    img.src = getEmojiSrc(emoji.id, emoji.animated);
    img.alt = `:${emoji.name}:`;
    img.title = `:${emoji.name}:`;
    img.width = 22;
    img.height = 22;
    img.style.display = "block";

    span.appendChild(img);

    const trailingSpace = document.createTextNode("\u200B");
    range.insertNode(trailingSpace);
    range.insertNode(span);

    const nextRange = document.createRange();
    nextRange.setStartAfter(trailingSpace);
    nextRange.collapse(true);

    selection?.removeAllRanges();
    selection?.addRange(nextRange);

    setEntry(serializeEditorContent(editor));
    setShowEmojiPicker(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, entry }),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok) {
        setError(getErrorMessage(data));
        setSaving(false);
        return;
      }

      setNotice("Saved.");
      setSaving(false);
    } catch {
      setError("Failed to save.");
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/journal/${entryId}`, { method: "DELETE" });

      if (!res.ok) {
        setError("Failed to delete.");
        setDeleting(false);
        return;
      }

      router.push(backUrl);
    } catch {
      setError("Failed to delete.");
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Edit Entry</h1>
            <p className={styles.subtitle}>
              Created {new Date(createdAt).toLocaleString()}
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.push(backUrl)}
            >
              Back
            </button>

            <button
              type="button"
              className={styles.danger}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <label className={styles.label}>
            Title
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Entry
            <div style={{ position: "relative", overflow: "visible" }}>
              {!entry ? (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    left: 14,
                    color: "rgba(244, 244, 245, 0.42)",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                >
                  Write your entry...
                </div>
              ) : null}

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                className={styles.textarea}
                style={{ whiteSpace: "pre-wrap" }}
              />

              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.08)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Open emoji picker"
              >
                <Image
                  src="/img/icons/face.svg"
                  alt="Emoji picker"
                  width={18}
                  height={18}
                />
              </button>

              {showEmojiPicker ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 320,
                    maxHeight: 260,
                    overflowY: "auto",
                    padding: 10,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "#0a0c1c",
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 8,
                    zIndex: 50,
                    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                >
                  {emojis.length > 0 ? (
                    emojis.map((emoji) => (
                      <button
                        key={emoji.id}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        title={`:${emoji.name}:`}
                        style={{
                          border: "none",
                          background: "transparent",
                          borderRadius: 8,
                          padding: 6,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Image
                          src={getEmojiSrc(emoji.id, emoji.animated)}
                          alt={emoji.name}
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </button>
                    ))
                  ) : (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        color: "rgba(244,244,245,0.72)",
                        fontSize: "0.9rem",
                      }}
                    >
                      No emojis found
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </label>

          {error && <div className={styles.error}>{error}</div>}
          {notice && <div className={styles.notice}>{notice}</div>}

          <button
            type="button"
            className={styles.primary}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {showDeleteConfirm ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 200,
          }}
        >
          <div
            style={{
              width: "min(100%, 460px)",
              borderRadius: 20,
              padding: 22,
              background: "rgba(15, 21, 45, 0.94)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontFamily: "var(--font-title)",
                fontSize: "1.45rem",
                color: "#f4f4f5",
              }}
            >
              Delete Entry?
            </h2>
            <p
              style={{
                margin: 0,
                color: "rgba(244,244,245,0.76)",
                fontFamily: "var(--font-body)",
                lineHeight: 1.5,
              }}
            >
              This will permanently delete this journal entry. This action
              cannot be undone.
            </p>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className={styles.secondary}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className={styles.danger}
              >
                {deleting ? "Deleting…" : "Delete Entry"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
