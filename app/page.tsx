import Link from "next/link"
import styles from "./login/home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Elysium Bot Dashboard</h1>
        <p className={styles.subtitle}>
          Manage your Discord server settings with ease. Configure commands,
          moderation, and more.
        </p>
        <div className={styles.actions}>
          <Link href="/login" className={styles.primaryButton}>
            Get Started
          </Link>

          <Link
            href="/dashboard"
            className={`${styles.secondaryButton} ${styles.outline}`}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
