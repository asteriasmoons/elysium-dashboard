"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./new.module.css";

const CURATED_MOODS = [
  "Happy",
  "Sad",
  "Content",
  "Energized",
  "Lonely",
  "Grateful",
  "Relieved",
  "Confident",
  "Amused",
  "Anxious",
  "Brave",
  "Discouraged",
  "Drained",
  "Excited",
  "Hopeful",
  "Hopeless",
  "Indifferent",
  "Irritated",
  "Joyful",
  "Overwhelmed",
  "Passionate",
  "Satisfied",
  "Surprised",
  "Inspired",
  "Affectionate",
];

const ALL_ACTIVITIES = [
  "Health",
  "Fitness",
  "Self-Care",
  "Hobbies",
  "Identity",
  "Spirituality",
  "Community",
  "Family",
  "Friends",
  "Partner",
  "Dating",
  "Tasks",
  "Work",
  "Education",
  "Travel",
  "Weather",
  "Current Events",
  "Money",
  "Sleep",
  "Creativity",
  "Entertainment",
  "Social",
  "Chores",
];

interface NewMoodClientProps {
  guildId?: string;
}

export default function NewMoodClient({ guildId }: NewMoodClientProps) {
  const router = useRouter();
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    );
  };

  async function handleSubmit() {
    if (selectedMoods.length === 0) {
      setError("Please select at least one mood");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moods: selectedMoods,
          activities: selectedActivities,
          note: note || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaving(false);
        setError(data.error || "Failed to create log");
        return;
      }

      router.push(
        `/dashboard/mood/${data.id}${guildId ? `?guildId=${guildId}` : ""}`
      );
    } catch (err) {
      setSaving(false);
      setError("Failed to create log");
    }
  }

  const backHref = `/dashboard/mood${guildId ? `?guildId=${guildId}` : ""}`;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>New Mood Log</h1>
            <p className={styles.subtitle}>
              Track how youre feeling right now.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.push(backHref)}
            >
              Back
            </button>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              How are you feeling? <span className={styles.required}>*</span>
            </h3>
            <p className={styles.sectionSubtitle}>Select one or more moods</p>
            <div className={styles.checkboxGrid}>
              {CURATED_MOODS.map((mood) => (
                <label key={mood} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedMoods.includes(mood)}
                    onChange={() => toggleMood(mood)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>{mood}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>What have you been doing?</h3>
            <p className={styles.sectionSubtitle}>
              Select activities (optional)
            </p>
            <div className={styles.checkboxGrid}>
              {ALL_ACTIVITIES.map((activity) => (
                <label key={activity} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedActivities.includes(activity)}
                    onChange={() => toggleActivity(activity)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>{activity}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>
              Add a Note (Optional)
              <textarea
                className={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any thoughts or details about how you're feeling..."
                maxLength={1000}
              />
            </label>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="button"
            className={styles.primary}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Log Mood"}
          </button>
        </div>
      </div>
    </div>
  );
}
