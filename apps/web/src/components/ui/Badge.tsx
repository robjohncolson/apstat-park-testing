import styles from "./Badge.module.css";
import React from "react";

type Variant = "success" | "info" | "warning";

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = "info", className = "", children }: BadgeProps) {
  const classes = [styles.badge, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
} 