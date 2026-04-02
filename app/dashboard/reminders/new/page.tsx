"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../reminders.module.css";

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

export default function NewReminderPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayValue = formatDateInputValue(today);

  const [text, setText] = useState("");
  const [date, setDate] = useState(todayValue);
  const [time, setTime] = useState("09:00");
  const [loading, setLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);

  const selectedDate = useMemo(() => {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [date]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    try {
      const [hourString, minuteString] = time.split(":");
      const hour = Number(hourString);
      const minute = Number(minuteString);
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const reminderSentAt = new Date(`${date}T${time}`);

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
              <textarea
                id="reminder-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your reminder..."
                rows={6}
                className={styles.textarea}
              />
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
                    <div className={styles.datePopover} role="dialog" aria-label="Choose date">
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
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <span key={day} className={styles.weekday}>
                            {day}
                          </span>
                        ))}
                      </div>

                      <div className={styles.calendarGrid}>
                        {calendarCells.map((cell) => {
                          const isSelected = isSameCalendarDay(cell.date, selectedDate);
                          const isToday = isSameCalendarDay(cell.date, today);

                          const className = [
                            styles.dayButton,
                            !cell.inCurrentMonth ? styles.dayButtonMuted : '',
                            isSelected ? styles.dayButtonSelected : '',
                            isToday ? styles.dayButtonToday : '',
                          ]
                            .filter(Boolean)
                            .join(' ');

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
