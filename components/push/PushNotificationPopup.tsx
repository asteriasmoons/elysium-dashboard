"use client";

import { useState } from "react";
import styles from "./push-popup.module.css";

export default function PushNotificationPopup() {
  const [open, setOpen] = useState(false);

  async function enablePush() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const reg = await navigator.serviceWorker.ready;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(sub),
      headers: {
        "Content-Type": "application/json",
      },
    });

    setOpen(false);
  }

  return (
    <>
      {/* Bell trigger */}
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => setOpen(true)}
      >
        🔔
      </button>

      {/* Popup */}
      {open && (
        <div className={styles.overlay}>
          <div className={styles.popup}>
            <h3 className={styles.title}>Enable Notifications</h3>

            <p className={styles.text}>
              Get reminders, streak alerts, and updates from your dashboard.
            </p>

            <div className={styles.actions}>
              <button className={styles.primary} onClick={enablePush}>
                Enable
              </button>

              <button
                className={styles.secondary}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
