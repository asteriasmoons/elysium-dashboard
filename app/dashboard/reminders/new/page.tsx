"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../reminders.module.css";
import Image from "next/image";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const safeDate = new Date(year, month - 1, day);
  return safeDate.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getEmojiSrc(emojiId: string, animated?: boolean): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=64&quality=lossless`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEditorHtml(text: string): string {
  const lines = text.split("\n");
  const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;

  return lines
    .map((line) => {
      let lastIndex = 0;
      let html = "";
      let match: RegExpExecArray | null;

      while ((match = emojiRegex.exec(line)) !== null) {
        const [fullMatch, animatedFlag, name, id] = match;
        const start = match.index;

        if (start > lastIndex) {
          html += escapeHtml(line.slice(lastIndex, start));
        }

        const src = getEmojiSrc(id, Boolean(animatedFlag));
        html += `<span contenteditable="false" data-emoji-tag="${escapeHtml(fullMatch)}" style="display:inline-flex;align-items:center;vertical-align:-0.2em;"><img src="${src}" alt=":${escapeHtml(name)}:" title=":${escapeHtml(name)}:" width="22" height="22" style="display:block;" /></span>\u200B`;
        lastIndex = start + fullMatch.length;
      }

      if (lastIndex < line.length) {
        html += escapeHtml(line.slice(lastIndex));
      }

      return html.length > 0 ? `<div>${html}</div>` : `<div><br></div>`;
    })
    .join("");
}

function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u200B/g, "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;

  if (element.tagName === "BR") {
    return "\n";
  }

  const emojiTag = element.getAttribute("data-emoji-tag");
  if (emojiTag) {
    return emojiTag;
  }

  const children = Array.from(element.childNodes).map(serializeEditorNode).join("");

  if (element.tagName === "DIV" || element.tagName === "P") {
    return `${children}\n`;
  }

  return children;
}

function serializeEditorContent(editor: HTMLDivElement): string {
  return Array.from(editor.childNodes)
    .map(serializeEditorNode)
    .join("")
    .replace(/\n+$/g, "");
}


type DiscordEmoji = {
  id: string;
  name: string;
  animated?: boolean;
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export default function NewReminderPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayValue = formatDateInputValue(today);

  const [text, setText] = useState("");
  const [date, setDate] = useState(todayValue);
  const [time, setTime] = useState("09:00");
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dayOfWeek, setDayOfWeek] = useState<number>(today.getDay());
  const [dayOfMonth, setDayOfMonth] = useState<number>(today.getDate());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);

  const selectedDate = useMemo(() => {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [date]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadEmojis() {
      try {
        const response = await fetch("/api/emojis");
        if (!response.ok) return;

        const data = await response.json();
        const nextEmojis = Array.isArray(data.emojis) ? data.emojis : [];
        setEmojis(nextEmojis);
      } catch (error) {
        console.error(error);
      }
    }

    loadEmojis();
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentSerialized = serializeEditorContent(editor);
    if (currentSerialized !== text) {
      editor.innerHTML = renderEditorHtml(text);
    }
  }, [text]);

  const calendarCells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const monthIndex = displayMonth.getMonth();
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = getDaysInMonth(year, monthIndex);
    const daysInPrevMonth = getDaysInMonth(year, monthIndex - 1);

    const cells: Array<{
      key: string;
      date: Date;
      label: number;
      inCurrentMonth: boolean;
    }> = [];

    for (let i = firstDay - 1; i >= 0; i -= 1) {
      const day = daysInPrevMonth - i;
      const cellDate = new Date(year, monthIndex - 1, day);
      cells.push({
        key: `prev-${day}`,
        date: cellDate,
        label: day,
        inCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(year, monthIndex, day);
      cells.push({
        key: `current-${day}`,
        date: cellDate,
        label: day,
        inCurrentMonth: true,
      });
    }

    const remainder = cells.length % 7;
    const trailing = remainder === 0 ? 0 : 7 - remainder;

    for (let day = 1; day <= trailing; day += 1) {
      const cellDate = new Date(year, monthIndex + 1, day);
      cells.push({
        key: `next-${day}`,
        date: cellDate,
        label: day,
        inCurrentMonth: false,
      });
    }

    return cells;
  }, [displayMonth]);

  function changeMonth(offset: number) {
    setDisplayMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  function selectDate(nextDate: Date) {
    setDate(formatDateInputValue(nextDate));
    setDisplayMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setShowDatePicker(false);
    dateButtonRef.current?.focus();
  }

  function insertEmoji(emoji: DiscordEmoji) {
    const tag = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
    const editor = editorRef.current;

    if (!editor) {
      setText((prev) => prev + tag);
      setShowEmojiPicker(false);
      return;
    }

    editor.focus();

    const selection = window.getSelection();
    let range: Range;

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if (!editor.contains(range.startContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    range.deleteContents();

    const span = document.createElement("span");
    span.setAttribute("contenteditable", "false");
    span.setAttribute("data-emoji-tag", tag);
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.verticalAlign = "-0.2em";

    const img = document.createElement("img");
    img.src = getEmojiSrc(emoji.id, emoji.animated);
    img.alt = `:${emoji.name}:`;
    img.title = `:${emoji.name}:`;
    img.width = 22;
    img.height = 22;
    img.style.display = "block";

    span.appendChild(img);

    const trailingSpace = document.createTextNode("\u200B");

    range.insertNode(trailingSpace);
    range.insertNode(span);

    const nextRange = document.createRange();
    nextRange.setStartAfter(trailingSpace);
    nextRange.collapse(true);

    selection?.removeAllRanges();
    selection?.addRange(nextRange);

    setText(serializeEditorContent(editor));
    setShowEmojiPicker(false);
  }

  function handleEditorInput() {
    const editor = editorRef.current;
    if (!editor) return;
    setText(serializeEditorContent(editor));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      const [hourString, minuteString] = time.split(":");
      const hour = Number(hourString);
      const minute = Number(minuteString);
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const reminderSentAt = new Date(`${date}T${time}`);
      const resolvedDayOfWeek = frequency === "weekly" ? dayOfWeek : null;
      const resolvedDayOfMonth = frequency === "monthly" ? dayOfMonth : null;

      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          hour,
          minute,
          zone,
          guildId: null,
          frequency,
          dayOfWeek: resolvedDayOfWeek,
          dayOfMonth: resolvedDayOfMonth,
          reminderSentAt: reminderSentAt.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create reminder");
      }

      router.push("/dashboard/reminders");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>New Reminder</h1>

        <form onSubmit={handleSubmit} className={styles.panel}>
          <div className={styles.formStack}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="reminder-text">
                Reminder text
              </label>
              <div style={{ position: "relative", overflow: "visible" }}>
                {!text ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 14,
                      color: "rgba(244, 244, 245, 0.42)",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  >
                    Write your reminder...
                  </div>
                ) : null}

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  className={styles.textarea}
                  style={{ whiteSpace: "pre-wrap" }}
                />
                
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className={styles.emojiButton}
                >
                  <Image
                    src="/img/icons/xsmile.svg"
                    alt="Emoji picker"
                    width={18}
                    height={18}
                  />
                </button>

                {showEmojiPicker ? (
                  <div
                    className={styles.emojiPopover}
                    style={{ top: "calc(100% + 8px)", bottom: "auto", right: 0, left: "auto" }}
                  >
                    {emojis.length > 0 ? (
                      emojis.map((emoji) => {
                        const src = getEmojiSrc(emoji.id, emoji.animated);

                        return (
                          <button
                            key={emoji.id}
                            type="button"
                            className={styles.emojiItem}
                            onClick={() => insertEmoji(emoji)}
                            title={`:${emoji.name}:`}
                          >
                            <Image
                              src={src}
                              alt={emoji.name}
                              width={24}
                              height={24}
                              unoptimized
                            />
                          </button>
                        );
                      })
                    ) : (
                      <div className={styles.emojiEmpty}>No emojis found</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
			
            <div className={styles.pickerRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="reminder-date-button">
                  Date
                </label>
                <div className={styles.dateField}>
                  <button
                    id="reminder-date-button"
                    ref={dateButtonRef}
                    type="button"
                    className={styles.dateButton}
                    onClick={() => setShowDatePicker((current) => !current)}
                    aria-expanded={showDatePicker}
                    aria-haspopup="dialog"
                  >
                    {formatDateLabel(date)}
                  </button>

                  {showDatePicker ? (
                    <div
                      className={styles.datePopover}
                      role="dialog"
                      aria-label="Choose date"
                    >
                      <div className={styles.calendarHeader}>
                        <button
                          type="button"
                          className={styles.calendarNav}
                          onClick={() => changeMonth(-1)}
                          aria-label="Previous month"
                        >
                          ←
                        </button>
                        <span className={styles.calendarMonthLabel}>
                          {getMonthLabel(displayMonth)}
                        </span>
                        <button
                          type="button"
                          className={styles.calendarNav}
                          onClick={() => changeMonth(1)}
                          aria-label="Next month"
                        >
                          →
                        </button>
                      </div>

                      <div className={styles.calendarWeekdays}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (day) => (
                            <span key={day} className={styles.weekday}>
                              {day}
                            </span>
                          ),
                        )}
                      </div>

                      <div className={styles.calendarGrid}>
                        {calendarCells.map((cell) => {
                          const isSelected = isSameCalendarDay(
                            cell.date,
                            selectedDate,
                          );
                          const isToday = isSameCalendarDay(cell.date, today);

                          const className = [
                            styles.dayButton,
                            !cell.inCurrentMonth ? styles.dayButtonMuted : "",
                            isSelected ? styles.dayButtonSelected : "",
                            isToday ? styles.dayButtonToday : "",
                          ]
                            .filter(Boolean)
                            .join(" ");

                          return (
                            <button
                              key={cell.key}
                              type="button"
                              className={className}
                              onClick={() => selectDate(cell.date)}
                            >
                              {cell.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="reminder-time">
                  Time
                </label>
                <input
                  id="reminder-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Frequency</label>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {FREQUENCY_OPTIONS.map((option) => {
                  const isActive = frequency === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFrequency(option.value)}
                      className={styles.primaryLink}
                      style={{
                        opacity: isActive ? 1 : 0.72,
                        outline: isActive
                          ? "2px solid rgba(255, 255, 255, 0.32)"
                          : "none",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {frequency === "weekly" ? (
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="reminder-day-of-week">
                  Day of week
                </label>
                <select
                  id="reminder-day-of-week"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className={styles.input}
                >
                  {WEEKDAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {frequency === "monthly" ? (
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="reminder-day-of-month">
                  Day of month
                </label>
                <select
                  id="reminder-day-of-month"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className={styles.input}
                >
                  {Array.from({ length: 31 }, (_, index) => index + 1).map(
                    (day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ),
                  )}
                </select>
              </div>
            ) : null}

            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={loading}
                className={styles.primaryLink}
              >
                {loading ? "Creating..." : "Create Reminder"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
