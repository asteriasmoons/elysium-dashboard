"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./entry.module.css";

type ApiOk = { ok: true };
type ApiError = { error: string };
type ApiResponse = ApiOk | ApiError;

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

  const [title, setTitle] = useState<string>(initialTitle);
  const [entry, setEntry] = useState<string>(initialEntry);

  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setError(null);
    setNotice(null);
    setSaving(true);

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

      setSaving(false);
      setNotice("Saved.");
    } catch {
      setSaving(false);
      setError("Failed to save.");
    }
  }

  async function handleDelete(): Promise<void> {
    setError(null);
    setNotice(null);

    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/journal/${entryId}`, { method: "DELETE" });
      const data = (await res.json()) as ApiResponse;

      if (!res.ok) {
        setError(getErrorMessage(data));
        setDeleting(false);
        return;
      }

      router.push("/dashboard/journal");
    } catch {
      setDeleting(false);
      setError("Failed to delete.");
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
              onClick={() => router.push("/dashboard/journal")}
            >
              Back
            </button>

            <button
              type="button"
              className={styles.danger}
              onClick={handleDelete}
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
            {notice ? <div className={styles.notice}>{notice}</div> : null}

            <button
              type="button"
              className={styles.primary}
              onClick={handleSave}
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
