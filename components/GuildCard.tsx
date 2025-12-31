import Image from "next/image";
import Link from "next/link";
import styles from "./GuildCard.module.css";

interface GuildCardProps {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

export function GuildCard({ id, name, icon, owner }: GuildCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.icon}>
          {icon ? (
            <Image
              src={icon}
              alt={name}
              width={64}
              height={64}
              className={styles.image}
            />
          ) : (
            <span className={styles.fallback}>
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className={styles.meta}>
          <h3 className={styles.name}>{name}</h3>
          <p className={styles.role}>{owner ? "Owner" : "Administrator"}</p>
        </div>
      </div>

      <Link href={`/dashboard/${id}`} className={styles.manageLink}>
        Manage Server
      </Link>
    </div>
  );
}
