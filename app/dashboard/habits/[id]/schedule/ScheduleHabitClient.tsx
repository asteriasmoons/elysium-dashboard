"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "../../habits.module.css";

type HabitData = {
  _id: string;
  name: string;
  description: string;
  hour: number;
  minute: number;
  timezone: string;
  frequency: "daily" | "weekly";
  dayOfWeek: number | null;
  createdAt: string | null;
};

type Props = {
  habit: HabitData;
  habitId: string;
  updateScheduleAction: (formData: FormData) => Promise<void>;
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
] as const;

function getEmojiSrc(emojiId: string, animated?: boolean): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=64&quality=lossless`;
}

function renderDiscordPreview(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, animatedFlag, name, id] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push(
      <Image
        key={`${id}-${start}-${fullMatch}`}
        src={getEmojiSrc(id, Boolean(animatedFlag))}
        alt={`:${name}:`}
        title={`:${name}:`}
        width={20}
        height={20}
        unoptimized
        style={{
          display: "inline-block",
          verticalAlign: "-0.2em",
          marginRight: 4,
        }}
      />,
    );

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.flatMap((part, index) => {
    if (typeof part !== "string") return part;

    return part.split("\n").flatMap((line, i, arr) => {
      if (i < arr.length - 1) {
        return [line, <br key={`br-${index}-${i}`} />];
      }
      return line;
    });
  });
}

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getMonthLabel(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function ScheduleHabitClient({
  habit,
  habitId,
  updateScheduleAction,
}: Props) {
  const weeklyMenuRef = useRef<HTMLDivElement | null>(null);
  const weeklyThumbRef = useRef<HTMLDivElement | null>(null);
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedFrequency, setSelectedFrequency] = useState<"daily" | "weekly">(
    habit.frequency ?? "daily",
  );
  const [selectedHour, setSelectedHour] = useState(habit.hour);
  const [selectedMinute, setSelectedMinute] = useState(habit.minute);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (habit.createdAt) {
      const parsed = new Date(habit.createdAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const parsed = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });

  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(
    typeof habit.dayOfWeek === "number" ? habit.dayOfWeek : null,
  );

  function changeMonth(amount: number) {
    setDisplayMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + amount);
      return next;
    });
  }

  function selectDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
    setDisplayMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setShowDatePicker(false);
  }

  const today = useMemo(() => new Date(), []);
  const selectedDateObject = useMemo(() => {
    const parsed = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [selectedDate]);

  const calendarCells = useMemo(() => {
    const startOfMonth = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
      1,
    );
    const startDay = startOfMonth.getDay();
    const gridStart = new Date(startOfMonth);
    gridStart.setDate(startOfMonth.getDate() - startDay);

    return Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + index);

      return {
        key: `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`,
        date: cellDate,
        label: cellDate.getDate(),
        inCurrentMonth: cellDate.getMonth() === displayMonth.getMonth(),
      };
    });
  }, [displayMonth]);

  useEffect(() => {
    const menu = weeklyMenuRef.current;
    const thumb = weeklyThumbRef.current;

    if (!menu || !thumb) return;

    const updateThumb = () => {
      const maxScroll = menu.scrollHeight - menu.clientHeight;
      const visibleRatio = menu.clientHeight / menu.scrollHeight;
      const thumbHeight = Math.max(menu.clientHeight * visibleRatio, 32);

      thumb.style.height = `${thumbHeight}px`;

      if (maxScroll <= 0) {
        thumb.style.transform = "translateY(0px)";
        return;
      }

      const maxMove = menu.clientHeight - thumbHeight;
      const ratio = menu.scrollTop / maxScroll;
      thumb.style.transform = `translateY(${ratio * maxMove}px)`;
    };

    menu.addEventListener("scroll", updateThumb, { passive: true });
    window.addEventListener("resize", updateThumb);
    requestAnimationFrame(updateThumb);

    return () => {
      menu.removeEventListener("scroll", updateThumb);
      window.removeEventListener("resize", updateThumb);
    };
  }, []);

  const currentFrequency = selectedFrequency;

  const currentFrequencyLabel = useMemo(() => {
    return (
      FREQUENCY_OPTIONS.find((option) => option.value === currentFrequency)
        ?.label ?? "Daily"
    );
  }, [currentFrequency]);

  const currentWeeklyLabel = useMemo(() => {
    return typeof selectedDayOfWeek === "number"
      ? (WEEKDAY_OPTIONS.find((option) => option.value === selectedDayOfWeek)
          ?.label ?? "Select a weekday")
      : "Select a weekday";
  }, [selectedDayOfWeek]);

  const currentDateLabel = useMemo(() => {
    return formatDateLabel(selectedDate);
  }, [selectedDate]);

  const currentTimeLabel = useMemo(() => {
    return `${selectedHour % 12 || 12}:${String(selectedMinute).padStart(2, "0")} ${
      selectedHour >= 12 ? "PM" : "AM"
    }`;
  }, [selectedHour, selectedMinute]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Schedule Habit</h1>
            <p className={styles.subtitle}>
              Review this habit&apos;s current schedule pattern.
            </p>
          </div>

          <div className={styles.actions}>
            <Link href="/dashboard/habits" className={styles.primaryLink}>
              Back
            </Link>
            <Link
              href={`/dashboard/habits/${habitId}`}
              className={styles.editLink}
            >
              Edit Habit
            </Link>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={`${styles.card} ${styles.cardWide}`}>
            <div className={styles.cardTop}>
              <h2 className={styles.cardTitle}>Habit</h2>
              <span className={styles.activeBadge}>Active</span>
            </div>

            <p className={styles.cardDescription}>
              {habit.name ? renderDiscordPreview(habit.name) : "No name"}
            </p>

            {habit.description ? (
              <p className={styles.cardDescription}>
                {renderDiscordPreview(habit.description)}
              </p>
            ) : (
              <p className={styles.cardDescriptionMuted}>No description</p>
            )}

            <p className={styles.cardTime}>Current Time: {currentTimeLabel}</p>

            <div className={styles.spacingMd}>
              <p className={styles.subtitle}>Current Schedule</p>
              <p className={styles.cardDescriptionMuted}>
                {currentFrequency === "weekly" && currentWeeklyLabel !== "Select a weekday"
                  ? `Weekly on ${currentWeeklyLabel}`
                  : "Daily"}
              </p>
            </div>

            <form action={updateScheduleAction} className={styles.spacingLg}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Habit Time</label>

                <div className={styles.rowFields}>
                  <details className={styles.customSelect}>
                    <summary className={styles.customSelectTrigger}>
                      <span>{`${selectedHour % 12 || 12} ${
                        selectedHour >= 12 ? "PM" : "AM"
                      }`}</span>
                      <span className={styles.customSelectChevron}>⌄</span>
                    </summary>

                    <div className={styles.customSelectMenu}>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const isSelected = selectedHour === hour;

                        return (
                          <label
                            key={hour}
                            className={
                              isSelected
                                ? `${styles.customSelectOption} ${styles.customSelectOptionSelected}`
                                : styles.customSelectOption
                            }
                          >
                            <input
                              type="radio"
                              name="hour"
                              value={hour}
                              checked={isSelected}
                              onChange={() => setSelectedHour(hour)}
                              className={styles.customSelectInput}
                            />
                            <span>{`${hour % 12 || 12} ${
                              hour >= 12 ? "PM" : "AM"
                            }`}</span>
                          </label>
                        );
                      })}
                    </div>
                  </details>

                  <details className={styles.customSelect}>
                    <summary className={styles.customSelectTrigger}>
                      <span>{String(selectedMinute).padStart(2, "0")}</span>
                      <span className={styles.customSelectChevron}>⌄</span>
                    </summary>

                    <div className={styles.customSelectMenuGrid}>
                      {Array.from({ length: 60 }, (_, minute) => {
                        const isSelected = selectedMinute === minute;

                        return (
                          <label
                            key={minute}
                            className={
                              isSelected
                                ? `${styles.customSelectOption} ${styles.customSelectOptionSelected}`
                                : styles.customSelectOption
                            }
                          >
                            <input
                              type="radio"
                              name="minute"
                              value={minute}
                              checked={isSelected}
                              onChange={() => setSelectedMinute(minute)}
                              className={styles.customSelectInput}
                            />
                            <span>{String(minute).padStart(2, "0")}</span>
                          </label>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </div>

              <div className={styles.fieldGroup + " " + styles.spacingMd}>
                <label className={styles.label} htmlFor="habit-date-button">
                  Date
                </label>

                <div className={styles.dateField}>
                  <input type="hidden" name="date" value={selectedDate} />
                  <button
                    id="habit-date-button"
                    ref={dateButtonRef}
                    type="button"
                    className={styles.scheduleDateButton}
                    onClick={() => setShowDatePicker((current) => !current)}
                    aria-expanded={showDatePicker}
                    aria-haspopup="dialog"
                  >
                    {currentDateLabel}
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
                            selectedDateObject,
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
                <label className={styles.label}>Choose Schedule Type</label>

                <details className={styles.customSelect}>
                  <summary className={styles.customSelectTrigger}>
                    <span>{currentFrequencyLabel}</span>
                    <span className={styles.customSelectChevron}>⌄</span>
                  </summary>

                  <div className={styles.customSelectMenu}>
                    {FREQUENCY_OPTIONS.map((option) => {
                      const isSelected = currentFrequency === option.value;

                      return (
                        <label
                          key={option.value}
                          className={
                            isSelected
                              ? `${styles.customSelectOption} ${styles.customSelectOptionSelected}`
                              : styles.customSelectOption
                          }
                        >
                          <input
                            type="radio"
                            name="frequency"
                            value={option.value}
                            checked={isSelected}
                            onChange={() => setSelectedFrequency(option.value)}
                            className={styles.customSelectInput}
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              </div>

              <div className={styles.fieldGroup + " " + styles.spacingMd}>
                <label className={styles.label}>Weekly day</label>

                <details className={styles.customSelect}>
                  <summary className={styles.customSelectTrigger}>
                    <span>{currentWeeklyLabel}</span>
                    <span className={styles.customSelectChevron}>⌄</span>
                  </summary>

                  <div className={styles.scrollWrapper}>
                    <div
                      className={styles.customSelectMenu}
                      ref={weeklyMenuRef}
                    >
                      {WEEKDAY_OPTIONS.map((option) => {
                        const isSelected = selectedDayOfWeek === option.value;

                        return (
                          <label
                            key={option.value}
                            className={
                              isSelected
                                ? `${styles.customSelectOption} ${styles.customSelectOptionSelected}`
                                : styles.customSelectOption
                            }
                          >
                            <input
                              type="radio"
                              name="dayOfWeek"
                              value={option.value}
                              checked={isSelected}
                              onChange={() => setSelectedDayOfWeek(option.value)}
                              className={styles.customSelectInput}
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className={styles.fakeScrollbar} aria-hidden="true">
                      <div className={styles.fakeThumb} ref={weeklyThumbRef} />
                    </div>
                  </div>
                </details>
              </div>

              <p
                className={styles.cardDescriptionMuted + " " + styles.spacingMd}
              >
                Choose the frequency, then pick the weekly option below before
                saving.
              </p>

              <div className={styles.formActions + " " + styles.spacingLg}>
                <button type="submit" className={styles.primaryLink}>
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}