import { ReactNode } from "react";
import styles from "./Badge.module.css";

type Variant = "success" | "info" | "warning";

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

export function Badge({ variant = "info", className = "", children }: BadgeProps) {
  const classes = [styles.badge, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
} 