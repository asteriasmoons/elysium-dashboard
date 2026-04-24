"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./push-popup.module.css";

export default function PushNotificationPopup() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");

  async function enablePush() {
    setStatus("");

    if (!("Notification" in window)) {
      setStatus("Notifications are not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setStatus("Notifications were not enabled.");
      return;
    }

    const reg = await navigator.serviceWorker.ready;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(sub),
      headers: {
        "Content-Type": "application/json",
      },
    });

    setStatus("Notifications enabled.");
  }

  return (
    <>
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => setOpen((current) => !current)}
        aria-label="Open notification settings"
      >
        <Image
          src="/img/icons/bell.svg"
          alt=""
          width={22}
          height={22}
          unoptimized
        />
      </button>

      {open ? (
        <div className={styles.popupCard}>
          <h3 className={styles.popupTitle}>Notifications</h3>

          <p className={styles.popupText}>
            Turn on notifications for reminders, habits, and dashboard updates.
          </p>

          <button
            type="button"
            className={styles.enableButton}
            onClick={enablePush}
          >
            Enable Notifications
          </button>

          {status ? <p className={styles.statusText}>{status}</p> : null}
        </div>
      ) : null}
    </>
  );
}
