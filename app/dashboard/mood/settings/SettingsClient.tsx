"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./settings.module.css";

interface ReminderSettings {
  isEnabled: boolean;
  hour: number;
  minute: number;
  frequency: "daily" | "weekly";
  timezone: string;
}

interface SettingsClientProps {
  guildId?: string;
}

export default function SettingsClient({ guildId }: SettingsClientProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<ReminderSettings>({
    isEnabled: false,
    hour: 9,
    minute: 0,
    frequency: "daily",
    timezone: "America/Chicago",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/mood/reminder");
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/mood/reminder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save settings");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const backHref = `/dashboard/mood${guildId ? `?guildId=${guildId}` : ""}`;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Mood Reminder Settings</h1>
            <p className={styles.subtitle}>
              Configure when you want to be reminded to log your mood
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
          <div className={styles.notice}>
            <strong>📱 Discord DM Reminders</strong>
            <p>
              These settings control when the bot sends you reminder DMs on
              Discord. Changes sync automatically with the bot.
            </p>
          </div>

          <div className={styles.section}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.isEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, isEnabled: e.target.checked })
                }
                className={styles.checkbox}
              />
              <span className={styles.toggleText}>
                Enable mood logging reminders
              </span>
            </label>
          </div>

          {settings.isEnabled && (
            <>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Reminder Time</h3>
                <div className={styles.timeInputs}>
                  <label className={styles.inputLabel}>
                    Hour (0-23)
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={settings.hour}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          hour: parseInt(e.target.value) || 0,
                        })
                      }
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.inputLabel}>
                    Minute (0-59)
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={settings.minute}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          minute: parseInt(e.target.value) || 0,
                        })
                      }
                      className={styles.input}
                    />
                  </label>
                </div>
                <p className={styles.timePreview}>
                  Reminder will be sent at{" "}
                  <strong>
                    {String(settings.hour).padStart(2, "0")}:
                    {String(settings.minute).padStart(2, "0")}
                  </strong>
                </p>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Frequency</h3>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="frequency"
                      value="daily"
                      checked={settings.frequency === "daily"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          frequency: e.target.value as "daily" | "weekly",
                        })
                      }
                      className={styles.radio}
                    />
                    <span className={styles.radioText}>Daily</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="frequency"
                      value="weekly"
                      checked={settings.frequency === "weekly"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          frequency: e.target.value as "daily" | "weekly",
                        })
                      }
                      className={styles.radio}
                    />
                    <span className={styles.radioText}>Weekly</span>
                  </label>
                </div>
              </div>

              <div className={styles.section}>
                <label className={styles.inputLabel}>
                  Timezone (IANA format)
                  <input
                    type="text"
                    value={settings.timezone}
                    onChange={(e) =>
                      setSettings({ ...settings, timezone: e.target.value })
                    }
                    placeholder="America/Chicago"
                    className={styles.input}
                  />
                </label>
                <p className={styles.hint}>
                  Examples: America/New_York, America/Los_Angeles, Europe/London
                </p>
              </div>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && (
            <div className={styles.success}>Settings saved successfully!</div>
          )}

          <button
            type="button"
            className={styles.primary}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
