"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./view.module.css";

type DiscordPart =
  | string
  | {
      id: string;
      name: string;
      animated?: boolean;
    };

function getEmojiSrc(emojiId: string, animated?: boolean): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=64&quality=lossless`;
}

function parseDiscordText(text: string): DiscordPart[][] {
  const lines = text.split("\n");
  const regex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;

  return lines.map((line) => {
    const parts: DiscordPart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      const [fullMatch, animatedFlag, name, id] = match;
      const start = match.index;

      if (start > lastIndex) {
        parts.push(line.slice(lastIndex, start));
      }

      parts.push({
        id,
        name,
        animated: Boolean(animatedFlag),
      });

      lastIndex = start + fullMatch.length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts;
  });
}

export default function ViewEntryClient({
  entryId,
  title,
  entry,
  createdAt,
}: {
  entryId: string;
  title: string;
  entry: string;
  createdAt: string;
}) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lines = parseDiscordText(entry);

  async function remove() {
    setDeleting(true);

    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setDeleting(false);
        return;
      }

      router.push("/dashboard/journal");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>{title || "Untitled Entry"}</h1>
            <p className={styles.subtitle}>
              {new Date(createdAt).toLocaleString()}
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.push("/dashboard/journal")}
            >
              Back
            </button>

            <button
              type="button"
              className={styles.primary}
              onClick={() => router.push(`/dashboard/journal/${entryId}`)}
            >
              Edit
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
          <div className={styles.entryContent}>
            {lines.map((line, lineIndex) => (
              <div key={lineIndex} className={styles.entryLine}>
                {line.length === 0 ? <br /> : null}
                {line.map((part, index) =>
                  typeof part === "string" ? (
                    <span key={`${lineIndex}-${index}`}>{part}</span>
                  ) : (
                    <Image
                      key={`${lineIndex}-${index}-${part.id}`}
                      src={getEmojiSrc(part.id, part.animated)}
                      alt={`:${part.name}:`}
                      title={`:${part.name}:`}
                      width={22}
                      height={22}
                      unoptimized
                      className={styles.inlineEmoji}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDeleteConfirm ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Delete Entry?</h2>
            <p className={styles.modalText}>
              This will permanently delete this journal entry.
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.danger}
                onClick={remove}
                disabled={deleting}
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
