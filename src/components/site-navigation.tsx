"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-navigation.module.css";

const links = [
  { href: "/", label: "목록" },
  { href: "/insights", label: "인사이트" },
];

export function SiteNavigation() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <nav className={styles.navigation} aria-label="주요 메뉴">
        <Link className={styles.brand} href="/">
          Box Office
        </Link>
        <div className={styles.links}>
          {links.map((link) => {
            const isCurrent = pathname === link.href;
            return (
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={isCurrent ? styles.active : styles.link}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
