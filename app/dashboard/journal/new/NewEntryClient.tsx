"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./new.module.css";

type CreateResponse = { id: string } | { error: string };

function getErrorMessage(value: unknown): string {
  if (value && typeof value === "object" && "error" in value) {
    const v = value as { error?: unknown };
    if (typeof v.error === "string") return v.error;
  }
  return "Something went wrong.";
}

export default function NewEntryClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [entry, setEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, entry }),
      });

      const data = (await res.json()) as CreateResponse;

      if (!res.ok) {
        setSaving(false);
        setError(getErrorMessage(data));
        return;
      }

      if ("id" in data && typeof data.id === "string") {
        router.push(`/dashboard/journal/${data.id}`);
        return;
      }

      setSaving(false);
      setError("Failed to create entry.");
    } catch {
      setSaving(false);
      setError("Failed to create entry.");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>New Entry</h1>
            <p className={styles.subtitle}>Create a new journal entry.</p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.push("/dashboard/journal")}
            >
              Back
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

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="button"
            className={styles.primary}
            onClick={create}
            disabled={saving}
          >
            {saving ? "Creating…" : "Create Entry"}
          </button>
      </div>
      </div>
    </div>
  );
}
