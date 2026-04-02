"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./entry.module.css";

type ApiResponse = { ok: true } | { error: string };

function getErrorMessage(value: unknown): string {
  if (value && typeof value === "object" && "error" in value) {
    const v = value as { error?: unknown };
    if (typeof v.error === "string") return v.error;
  }
  return "Something went wrong.";
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const backUrl = "/dashboard/journal";

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
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    try {
      await fetch(`/api/journal/${entryId}`, { method: "DELETE" });
      router.push(backUrl);
    } catch {
      setError("Failed to delete.");
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

            <button type="button" className={styles.danger} onClick={remove}>
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
            <textarea
              className={styles.textarea}
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
            />
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
    </div>
  );
}
