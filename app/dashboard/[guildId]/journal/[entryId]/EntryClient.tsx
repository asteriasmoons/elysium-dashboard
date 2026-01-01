"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./entry.module.css";

export default function EntryClient({
  guildId,
  entryId,
  initialTitle,
  initialEntry,
  createdAt,
}: {
  guildId: string;
  entryId: string;
  initialTitle: string;
  initialEntry: string;
  createdAt: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [entry, setEntry] = useState(initialEntry);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/journal/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, entry }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to save");
        setSaving(false);
        return;
      }

      router.refresh();
      setSaving(false);
    } catch {
      setError("Failed to save");
      setSaving(false);
    }
  }

  async function remove() {
    setError(null);
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/journal/${entryId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to delete");
        setDeleting(false);
        return;
      }

      router.push(`/dashboard/${guildId}/journal`);
      router.refresh();
    } catch {
      setError("Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Entry</h1>
            <p className={styles.subtitle}>
              Created {new Date(createdAt).toLocaleString()}
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.push(`/dashboard/${guildId}/journal`)}
            >
              Back
            </button>

            <button
              type="button"
              className={styles.danger}
              onClick={remove}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.form}>
            <label className={styles.label}>
              Title
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </label>

            <label className={styles.label}>
              Entry
              <textarea
                className={styles.textarea}
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                maxLength={8000}
              />
            </label>

            {error ? <div className={styles.error}>{error}</div> : null}

            <button
              type="button"
              className={styles.primary}
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
