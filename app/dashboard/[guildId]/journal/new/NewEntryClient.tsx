"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./new.module.css";

export default function NewEntryClient({ guildId }: { guildId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, entry }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to create entry");
        setSaving(false);
        return;
      }

      router.push(`/dashboard/${guildId}/journal/${data.id}`);
      router.refresh();
    } catch {
      setError("Failed to create entry");
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>New Entry</h1>
            <p className={styles.subtitle}>
              Create a journal entry for your account.
            </p>
          </div>

          <button
            type="button"
            className={styles.secondary}
            onClick={() => router.push(`/dashboard/${guildId}/journal`)}
          >
            Back
          </button>
        </div>

        <div className={styles.panel}>
          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>
              Title
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title"
                maxLength={120}
              />
            </label>

            <label className={styles.label}>
              Entry
              <textarea
                className={styles.textarea}
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="Write your entry..."
                maxLength={8000}
              />
            </label>

            {error ? <div className={styles.error}>{error}</div> : null}

            <button className={styles.primary} type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Entry"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
