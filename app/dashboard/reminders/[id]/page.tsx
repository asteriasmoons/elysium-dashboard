"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import styles from "../reminders.module.css";

const TIMEZONE_OPTIONS = [
  "America/Chicago","America/New_York","America/Denver","America/Los_Angeles",
  "Europe/London","Europe/Paris","Asia/Tokyo","Asia/Singapore","Australia/Sydney","Pacific/Auckland",
];
const WEEKDAY_OPTIONS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const INTERVAL_PRESETS = [
  { label: "30 min", value: "30m" },{ label: "1 hour", value: "1h" },{ label: "2 hours", value: "2h" },
  { label: "6 hours", value: "6h" },{ label: "12 hours", value: "12h" },{ label: "Daily", value: "1d" },{ label: "Weekly", value: "1w" },
];

type DiscordEmoji = { id: string; name: string; animated?: boolean };
type ActiveEditor = "title" | "description" | null;
type Channel = { id: string; name: string };
type Role = { id: string; name: string };

type ReminderResponse = {
  _id: string; type: "guild"|"dm"; name: string; interval: string;
  startDate: string|null; ping: string; channelId: string|null;
  dayOfWeek: string|null; embedTitle: string; embedDescription: string;
  embedColor: string; timezone: string; guildId: string|null;
};

function pad(n: number) { return String(n).padStart(2,"0"); }
function localDatetimeValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function getEmojiSrc(id: string, animated?: boolean) {
  return `https://cdn.discordapp.com/emojis/${id}.${animated?"gif":"png"}?size=64&quality=lossless`;
}
function escapeHtml(v: string) {
  return v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function renderEditorHtml(text: string): string {
  const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;
  return text.split("\n").map((line) => {
    let lastIndex = 0; let html = ""; let match: RegExpExecArray|null;
    while ((match = emojiRegex.exec(line)) !== null) {
      const [fullMatch, animatedFlag, name, id] = match;
      if (match.index > lastIndex) html += escapeHtml(line.slice(lastIndex, match.index));
      html += `<span contenteditable="false" data-emoji-tag="${escapeHtml(fullMatch)}" style="display:inline-flex;align-items:center;vertical-align:-0.2em;"><img src="${getEmojiSrc(id,Boolean(animatedFlag))}" alt=":${escapeHtml(name)}:" title=":${escapeHtml(name)}:" width="22" height="22" style="display:block;" /></span>\u200B`;
      lastIndex = match.index + fullMatch.length;
    }
    if (lastIndex < line.length) html += escapeHtml(line.slice(lastIndex));
    return html.length > 0 ? `<div>${html}</div>` : `<div><br></div>`;
  }).join("");
}
function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\u200B/g,"");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  if (el.tagName === "BR") return "\n";
  const emojiTag = el.getAttribute("data-emoji-tag");
  if (emojiTag) return emojiTag;
  const children = Array.from(el.childNodes).map(serializeEditorNode).join("");
  if (el.tagName === "DIV" || el.tagName === "P") return `${children}\n`;
  return children;
}
function serializeEditorContent(editor: HTMLDivElement) {
  return Array.from(editor.childNodes).map(serializeEditorNode).join("").replace(/\n+$/g,"");
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
    fetch("/api/emojis").then(r => r.ok ? r.json() : null).then(d => { if (d?.emojis) setEmojis(d.emojis); }).catch(console.error);
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

  // Load channels + roles when guildId is known and type is guild
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

  useEffect(() => {
    const editor = titleEditorRef.current;
    if (!editor) return;
    if (serializeEditorContent(editor) !== embedTitle) editor.innerHTML = renderEditorHtml(embedTitle);
  }, [embedTitle]);

  useEffect(() => {
    const editor = descEditorRef.current;
    if (!editor) return;
    if (serializeEditorContent(editor) !== embedDescription) editor.innerHTML = renderEditorHtml(embedDescription);
  }, [embedDescription]);

  function insertEmojiTag(tag: string) {
    const editor = activeEditor === "title" ? titleEditorRef.current : descEditorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.startContainer)) {
        range.deleteContents();
        const textNode = document.createTextNode(tag);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    const next = serializeEditorContent(editor);
    editor.innerHTML = renderEditorHtml(next);
    if (activeEditor === "title") setEmbedTitle(next); else setEmbedDescription(next);
    setShowEmojiPicker(false);
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
        <h1 className={styles.title}>Edit Reminder</h1>
        <form onSubmit={handleSubmit} className={styles.panel}>
          <div className={styles.formStack}>
            {error ? <p style={{ color: "#f87171", margin: 0 }}>{error}</p> : null}

            {/* Guild fields — only shown for guild type */}
            {reminderType === "guild" && guildId ? (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Channel</label>
                  {loadingChannels ? (
                    <p className={styles.emptyText}>Loading channels...</p>
                  ) : (
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

            {/* Embed title */}
            <div className={styles.fieldGroup} style={{ position: "relative" }}>
              <label className={styles.label}>Embed title</label>
              <div ref={titleEditorRef} contentEditable suppressContentEditableWarning className={styles.input}
                onFocus={() => setActiveEditor("title")}
                onInput={(e) => setEmbedTitle(serializeEditorContent(e.currentTarget))}
                onBlur={(e) => setEmbedTitle(serializeEditorContent(e.currentTarget))}
                style={{ minHeight: 44, paddingRight: 42, whiteSpace: "pre-wrap", overflowWrap: "break-word" }} />
              <button type="button" className={styles.emojiButton} onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setActiveEditor("title"); setShowEmojiPicker(v => !v); }}>
                <Image src="/img/icons/face.svg" alt="emoji" width={20} height={20} unoptimized />
              </button>
            </div>

            {/* Embed description */}
            <div className={styles.fieldGroup} style={{ position: "relative" }}>
              <label className={styles.label}>Embed description</label>
              <div ref={descEditorRef} contentEditable suppressContentEditableWarning className={styles.textarea}
                onFocus={() => setActiveEditor("description")}
                onInput={(e) => setEmbedDescription(serializeEditorContent(e.currentTarget))}
                onBlur={(e) => setEmbedDescription(serializeEditorContent(e.currentTarget))}
                style={{ paddingRight: 42 }} />
              <button type="button" className={styles.emojiButton} onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setActiveEditor("description"); setShowEmojiPicker(v => !v); }}>
                <Image src="/img/icons/face.svg" alt="emoji" width={20} height={20} unoptimized />
              </button>
              {showEmojiPicker ? (
                <div className={styles.emojiPopover} onMouseDown={(e) => e.preventDefault()}>
                  {emojis.length > 0 ? emojis.map((emoji) => {
                    const tag = `<${emoji.animated?"a":""}:${emoji.name}:${emoji.id}>`;
                    return (
                      <button key={emoji.id} type="button" className={styles.emojiItem}
                        onMouseDown={(e) => e.preventDefault()} onClick={() => insertEmojiTag(tag)} title={emoji.name}>
                        <Image src={getEmojiSrc(emoji.id, emoji.animated)} alt={emoji.name} width={28} height={28} unoptimized />
                      </button>
                    );
                  }) : <div className={styles.emojiEmpty}>No emojis found</div>}
                </div>
              ) : null}
            </div>

            {/* Embed color */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Embed color</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="color" value={embedColor} onChange={(e) => setEmbedColor(e.target.value)}
                  style={{ width: 40, height: 36, padding: 2, cursor: "pointer", borderRadius: 6, border: "none", background: "none" }} />
                <input type="text" value={embedColor} onChange={(e) => setEmbedColor(e.target.value)} className={styles.input} style={{ flex: 1 }} placeholder="#8757f2" />
              </div>
            </div>

            {/* Interval */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Interval</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {INTERVAL_PRESETS.map((preset) => (
                  <button key={preset.value} type="button" onClick={() => { setInterval(preset.value); setUseCustomInterval(false); }}
                    className={styles.primaryLink}
                    style={{ opacity: !useCustomInterval && interval === preset.value ? 1 : 0.55, outline: !useCustomInterval && interval === preset.value ? "2px solid rgba(255,255,255,0.32)" : "none" }}>
                    {preset.label}
                  </button>
                ))}
                <button type="button" onClick={() => setUseCustomInterval(true)} className={styles.primaryLink}
                  style={{ opacity: useCustomInterval ? 1 : 0.55, outline: useCustomInterval ? "2px solid rgba(255,255,255,0.32)" : "none" }}>
                  Custom
                </button>
              </div>
              {useCustomInterval ? <input type="text" value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} className={styles.input} placeholder="e.g. 4h, 2d, 30m" /> : null}
            </div>

            {/* Start datetime */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="start-datetime">Start date &amp; time</label>
              <input id="start-datetime" type="datetime-local" value={startDatetime} onChange={(e) => setStartDatetime(e.target.value)} className={styles.input} />
            </div>

            {/* Timezone */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="timezone">Timezone</label>
              <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={styles.input}>
                {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            {/* Day of week */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="day-of-week">Day of week <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <select id="day-of-week" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className={styles.input}>
                <option value="">Every day</option>
                {WEEKDAY_OPTIONS.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => router.push("/dashboard/reminders")} className={styles.secondaryLink}>Cancel</button>
              <button type="submit" disabled={saving} className={styles.primaryLink}>{saving ? "Saving..." : "Save Reminder"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
