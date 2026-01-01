import Link from "next/link";
import styles from "./FeatureGrid.module.css";
import type { FeatureItem } from "@/lib/features";

function resolveHref(feature: FeatureItem, guildId?: string): string {
  if (typeof feature.href === "string") return feature.href;

  // Guild-scoped routes need a guildId. If we don't have it, fall back safely.
  if (!guildId || guildId === "undefined") return "/dashboard";

  return feature.href(guildId);
}

export function FeatureGrid({
  features,
  guildId,
}: {
  features: FeatureItem[];
  guildId?: string;
}) {
  return (
    <div className={styles.grid}>
      {features.map((f) => {
        const href = resolveHref(f, guildId);

        return (
          <Link key={f.key} href={href} className={styles.card}>
            <div className={styles.cardTop}>
              <h3 className={styles.title}>{f.title}</h3>
              {f.status ? <span className={styles.badge}>{f.status}</span> : null}
            </div>

            <p className={styles.description}>{f.description}</p>
          </Link>
        );
      })}
    </div>
  );
}