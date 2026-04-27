"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
type Guild = { id: string; name: string; icon: string | null };
type Channel = { id: string; name: string };
type Role = { id: string; name: string };

function pad(n: number) { return String(n).padStart(2, "0"); }
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
    let lastIndex = 0; let html = ""; let match: RegExpExecArray | null;
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

export default function NewReminderPage() {
  const router = useRouter();
  const now = new Date();

  const [reminderType, setReminderType] = useState<"dm"|"guild">("dm");
  const [name, setName] = useState("");
  const [interval, setInterval] = useState("1d");
  const [customInterval, setCustomInterval] = useState("");
  const [useCustomInterval, setUseCustomInterval] = useState(false);
  const [startDatetime, setStartDatetime] = useState(localDatetimeValue(now));
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [embedTitle, setEmbedTitle] = useState("Reminder!");
  const [embedDescription, setEmbedDescription] = useState("");
  const [embedColor, setEmbedColor] = useState("#8757f2");
  const [ping, setPing] = useState("");
  const [channelId, setChannelId] = useState("");
  const [guildId, setGuildId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const titleEditorRef = useRef<HTMLDivElement|null>(null);
  const descEditorRef = useRef<HTMLDivElement|null>(null);

  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
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
    if (reminderType !== "guild") return;
    setLoadingGuilds(true);
    fetch("/api/guilds").then(r => r.ok ? r.json() : null).then(d => { if (d?.guilds) setGuilds(d.guilds); }).catch(console.error).finally(() => setLoadingGuilds(false));
  }, [reminderType]);

  useEffect(() => {
    if (!guildId) { setChannels([]); setRoles([]); return; }
    setLoadingChannels(true);
    Promise.all([
      fetch(`/api/guilds/${guildId}/channels`).then(r => r.ok ? r.json() : null),
      fetch(`/api/guilds/${guildId}/roles`).then(r => r.ok ? r.json() : null),
    ]).then(([chData, roData]) => {
      setChannels(chData?.channels ?? []);
      setRoles(roData?.roles ?? []);
    }).catch(console.error).finally(() => setLoadingChannels(false));
  }, [guildId]);

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
    if (!name.trim()) return setError("Name is required.");
    if (!resolvedInterval.trim()) return setError("Interval is required.");
    if (!startDatetime) return setError("Start date is required.");
    if (reminderType === "guild" && !guildId) return setError("Please select a server.");
    if (reminderType === "guild" && !channelId) return setError("Please select a channel.");
    setLoading(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reminderType,
          name: name.trim(),
          interval: resolvedInterval.trim(),
          startDate: new Date(startDatetime).toISOString(),
          dayOfWeek: dayOfWeek || null,
          embedTitle: embedTitle.trim() || "Reminder!",
          embedDescription: embedDescription.trim(),
          embedColor,
          timezone,
          ...(reminderType === "guild" ? { guildId, channelId, ping } : {}),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create reminder"); }
      router.push("/dashboard/reminders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>New Reminder</h1>
            <p className={styles.subtitle}>Create a new DM or server reminder.</p>
          </div>
          <div className={styles.actions}>
            <a href="/dashboard/reminders" className={styles.secondaryLink}>Back</a>
          </div>
        </div>
        <form onSubmit={handleSubmit} className={styles.panel}>
          <div className={styles.formStack}>
            {error ? <p style={{ color: "#f87171", margin: 0 }}>{error}</p> : null}

            {/* Type */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["dm","guild"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => { setReminderType(t); setGuildId(""); setChannelId(""); setPing(""); }}
                    className={`${styles.typeButton} ${reminderType === t ? styles.typeButtonActive : ""}`}>
                    {t === "dm" ? "DM" : "Server"}
                  </button>
                ))}
              </div>
            </div>

            {/* Guild picker — only for guild type */}
            {reminderType === "guild" ? (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Server</label>
                  {loadingGuilds ? (
                    <p className={styles.emptyText}>Loading servers...</p>
                  ) : (
                    <select value={guildId} onChange={(e) => { setGuildId(e.target.value); setChannelId(""); setPing(""); }} className={styles.input}>
                      <option value="">Select a server...</option>
                      {guilds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  )}
                </div>

                {guildId ? (
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
              </>
            ) : null}

            {/* Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="reminder-name">Name</label>
              <input id="reminder-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} placeholder="e.g. Morning check-in" />
            </div>

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
                  {emojis.map((emoji) => {
                    const tag = `<${emoji.animated?"a":""}:${emoji.name}:${emoji.id}>`;
                    return (
                      <button key={emoji.id} type="button" className={styles.emojiItem}
                        onMouseDown={(e) => e.preventDefault()} onClick={() => insertEmojiTag(tag)} title={emoji.name}>
                        <Image src={getEmojiSrc(emoji.id, emoji.animated)} alt={emoji.name} width={28} height={28} unoptimized />
                      </button>
                    );
                  })}
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
              <button type="submit" disabled={loading} className={styles.formButton}>{loading ? "Creating..." : "Create Reminder"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
