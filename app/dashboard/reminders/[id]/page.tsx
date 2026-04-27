"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "../reminders.module.css";
import EmojiPicker, { type DiscordEmoji } from "@/components/discord/EmojiPicker";
import {
  syncDiscordEditorContent,
  serializeDiscordEditorContent,
  insertDiscordEmojiTagIntoEditor,
} from "@/lib/discordEmojiEditor";

const TIMEZONE_OPTIONS = [
  "America/Chicago","America/New_York","America/Denver","America/Los_Angeles",
  "Europe/London","Europe/Paris","Asia/Tokyo","Asia/Singapore","Australia/Sydney","Pacific/Auckland",
];
const WEEKDAY_OPTIONS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const INTERVAL_PRESETS = [
  { label: "30 min", value: "30m" },{ label: "1 hour", value: "1h" },{ label: "2 hours", value: "2h" },
  { label: "6 hours", value: "6h" },{ label: "12 hours", value: "12h" },{ label: "Daily", value: "1d" },{ label: "Weekly", value: "1w" },
];

type ActiveEditor = "title" | "description" | null;
type Channel = { id: string; name: string };
type Role = { id: string; name: string };

type ReminderResponse = {
  _id: string; type: "guild"|"dm"; name: string; interval: string;
  startDate: string|null; ping: string; channelId: string|null;
  dayOfWeek: string|null; embedTitle: string; embedDescription: string;
  embedColor: string; timezone: string; guildId: string|null;
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function localDatetimeValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditReminderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reminderId = params.id;

  const [loadingReminder, setLoadingReminder] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reminderType, setReminderType] = useState<"guild"|"dm">("dm");

  const [interval, setInterval] = useState("1d");
  const [customInterval, setCustomInterval] = useState("");
  const [useCustomInterval, setUseCustomInterval] = useState(false);
  const [startDatetime, setStartDatetime] = useState("");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [embedTitle, setEmbedTitle] = useState("Reminder!");
  const [embedDescription, setEmbedDescription] = useState("");
  const [embedColor, setEmbedColor] = useState("#8757f2");
  const [ping, setPing] = useState("");
  const [channelId, setChannelId] = useState("");
  const [guildId, setGuildId] = useState("");

  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const titleEditorRef = useRef<HTMLDivElement|null>(null);
  const descEditorRef = useRef<HTMLDivElement|null>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const resolvedInterval = useCustomInterval ? customInterval : interval;

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
    async function load() {
      try {
        const res = await fetch(`/api/reminders/${reminderId}`);
        if (!res.ok) throw new Error("Failed to load reminder");
        const data = (await res.json()) as ReminderResponse;

        setReminderType(data.type);
        const preset = INTERVAL_PRESETS.find(p => p.value === data.interval);
        if (preset) { setInterval(data.interval); setUseCustomInterval(false); }
        else { setCustomInterval(data.interval); setUseCustomInterval(true); }
        if (data.startDate) {
          const d = new Date(data.startDate);
          if (!Number.isNaN(d.getTime())) setStartDatetime(localDatetimeValue(d));
        }
        setTimezone(data.timezone || "America/Chicago");
        setDayOfWeek(data.dayOfWeek || "");
        setEmbedTitle(data.embedTitle || "Reminder!");
        setEmbedDescription(data.embedDescription || "");
        setEmbedColor(data.embedColor || "#8757f2");
        setPing(data.ping || "");
        setChannelId(data.channelId || "");
        setGuildId(data.guildId || "");
      } catch (err) {
        setError("Failed to load reminder."); console.error(err);
      } finally {
        setLoadingReminder(false);
      }
    }
    if (reminderId) load();
  }, [reminderId]);

  useEffect(() => {
    if (!guildId || reminderType !== "guild") { setChannels([]); setRoles([]); return; }
    setLoadingChannels(true);
    Promise.all([
      fetch(`/api/guilds/${guildId}/channels`).then(r => r.ok ? r.json() : null),
      fetch(`/api/guilds/${guildId}/roles`).then(r => r.ok ? r.json() : null),
    ]).then(([chData, roData]) => {
      setChannels(chData?.channels ?? []);
      setRoles(roData?.roles ?? []);
    }).catch(console.error).finally(() => setLoadingChannels(false));
  }, [guildId, reminderType]);

  useEffect(() => { syncDiscordEditorContent(titleEditorRef.current, embedTitle); }, [embedTitle]);
  useEffect(() => { syncDiscordEditorContent(descEditorRef.current, embedDescription); }, [embedDescription]);

  function insertEmojiTag(tag: string) {
    if (activeEditor === "title") {
      insertDiscordEmojiTagIntoEditor(titleEditorRef.current, embedTitle, setEmbedTitle, tag, () => setShowEmojiPicker(false));
    } else {
      insertDiscordEmojiTagIntoEditor(descEditorRef.current, embedDescription, setEmbedDescription, tag, () => setShowEmojiPicker(false));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!resolvedInterval.trim()) return setError("Interval is required.");
    if (!startDatetime) return setError("Start date is required.");
    if (reminderType === "guild" && !channelId) return setError("Please select a channel.");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        interval: resolvedInterval.trim(),
        startDate: new Date(startDatetime).toISOString(),
        dayOfWeek: dayOfWeek || null,
        embedTitle: embedTitle.trim() || "Reminder!",
        embedDescription: embedDescription.trim(),
        embedColor,
        timezone,
        ...(reminderType === "guild" ? { ping, channelId: channelId || null } : {}),
      };
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to save reminder"); }
      router.push("/dashboard/reminders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingReminder) {
    return (
      <div className={styles.page}><div className={styles.container}><div className={styles.panel}>
        <p className={styles.emptyText}>Loading reminder...</p>
      </div></div></div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Edit Reminder</h1>
            <p className={styles.subtitle}>Update your reminder settings.</p>
          </div>
          <div className={styles.actions}>
            <Link href="/dashboard/reminders" className={styles.secondaryLink}>Back</Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.panel}>
          <div className={styles.formStack}>
            {error ? <p style={{ color: "#f87171", margin: 0 }}>{error}</p> : null}

            {reminderType === "guild" && guildId ? (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Channel</label>
                  {loadingChannels ? <p className={styles.emptyText}>Loading channels...</p> : (
                    <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className={styles.input}>
                      <option value="">Select a channel...</option>
                      {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Ping <span style={{ opacity: 0.5 }}>(optional)</span></label>
                  <select value={ping} onChange={(e) => setPing(e.target.value)} className={styles.input}>
                    <option value="">None</option>
                    {roles.map((r) => <option key={r.id} value={`<@&${r.id}>`}>{r.name}</option>)}
                  </select>
                </div>
              </>
            ) : null}

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Embed title</label>
              <div className={styles.editorWrap}>
                <div ref={titleEditorRef} contentEditable suppressContentEditableWarning className={styles.input}
                  onFocus={() => setActiveEditor("title")}
                  onInput={(e) => setEmbedTitle(serializeDiscordEditorContent(e.currentTarget))}
                  onBlur={(e) => setEmbedTitle(serializeDiscordEditorContent(e.currentTarget))}
                  style={{ minHeight: 44, paddingRight: 42, whiteSpace: "pre-wrap", overflowWrap: "break-word" }} />
                <button type="button" className={styles.emojiButton} onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setActiveEditor("title"); setShowEmojiPicker(v => !v); }}>
                  <Image src="/img/icons/face.svg" alt="emoji" width={20} height={20} unoptimized />
                </button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Embed description</label>
              <div className={styles.editorWrap}>
                <div ref={descEditorRef} contentEditable suppressContentEditableWarning className={styles.textarea}
                  onFocus={() => setActiveEditor("description")}
                  onInput={(e) => setEmbedDescription(serializeDiscordEditorContent(e.currentTarget))}
                  onBlur={(e) => setEmbedDescription(serializeDiscordEditorContent(e.currentTarget))}
                  style={{ paddingRight: 42 }} />
                <button type="button" className={styles.emojiButton} onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setActiveEditor("description"); setShowEmojiPicker(v => !v); }}>
                  <Image src="/img/icons/face.svg" alt="emoji" width={20} height={20} unoptimized />
                </button>
              </div>
            </div>

            {showEmojiPicker ? (
              <EmojiPicker emojis={emojis} onPick={insertEmojiTag} className={styles.emojiPopover} itemClassName={styles.emojiItem} />
            ) : null}

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Embed color</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="color" value={embedColor} onChange={(e) => setEmbedColor(e.target.value)}
                  style={{ width: 40, height: 36, padding: 2, cursor: "pointer", borderRadius: 6, border: "none", background: "none" }} />
                <input type="text" value={embedColor} onChange={(e) => setEmbedColor(e.target.value)} className={styles.input} style={{ flex: 1 }} placeholder="#8757f2" />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Interval</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {INTERVAL_PRESETS.map((preset) => (
                  <button key={preset.value} type="button" onClick={() => { setInterval(preset.value); setUseCustomInterval(false); }}
                    className={`${styles.intervalButton} ${!useCustomInterval && interval === preset.value ? styles.intervalButtonActive : ""}`}>
                    {preset.label}
                  </button>
                ))}
                <button type="button" onClick={() => setUseCustomInterval(true)}
                  className={`${styles.intervalButton} ${useCustomInterval ? styles.intervalButtonActive : ""}`}>
                  Custom
                </button>
              </div>
              {useCustomInterval ? <input type="text" value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} className={styles.input} placeholder="e.g. 4h, 2d, 30m" /> : null}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="start-datetime">Start date &amp; time</label>
              <input id="start-datetime" type="datetime-local" value={startDatetime} onChange={(e) => setStartDatetime(e.target.value)} className={styles.input} />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="timezone">Timezone</label>
              <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={styles.input}>
                {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="day-of-week">Day of week <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <select id="day-of-week" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className={styles.input}>
                <option value="">Every day</option>
                {WEEKDAY_OPTIONS.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => router.push("/dashboard/reminders")} className={styles.secondaryLink}>Cancel</button>
              <button type="submit" disabled={saving} className={styles.formButton}>{saving ? "Saving..." : "Save Reminder"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
