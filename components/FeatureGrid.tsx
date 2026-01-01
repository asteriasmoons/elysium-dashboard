import Link from "next/link";
import styles from "./FeatureGrid.module.css";
import type { FeatureItem } from "@/lib/features";

export function FeatureGrid({
  guildId,
  features,
}: {
  guildId: string;
  features: FeatureItem[];
}) {
  return (
    <div className={styles.grid}>
      {features.map((f) => (
        <Link key={f.key} href={f.href(guildId)} className={styles.card}>
          <div className={styles.cardTop}>
            <h3 className={styles.title}>{f.title}</h3>
            <span className={styles.badge}>
              {f.status === "ready"
                ? "Ready"
                : f.status === "in-progress"
                ? "In Progress"
                : "Planned"}
            </span>
          </div>
          <p className={styles.desc}>{f.description}</p>
          <div className={styles.cta}>Open</div>
        </Link>
      ))}
    </div>
  );
}
