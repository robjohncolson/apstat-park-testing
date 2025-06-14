import React from "react";
import styles from "./PageShell.module.css";
import { AppHeader } from "../AppHeader/AppHeader";
import { AppFooter } from "../AppFooter/AppFooter";

interface PageShellProps {
  /**
   * If true, the shell takes full‐width with no max‐width constraint (e.g. Leaderboard).
   */
  fluid?: boolean;
  /**
   * Optional extra CSS classes.
   */
  className?: string;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({
  fluid = false,
  className = "",
  children,
}) => {
  const containerClass = fluid ? styles.fluid : styles.container;
  return (
    <>
      <AppHeader />
      <main className={`${containerClass} ${className}`}>{children}</main>
      <AppFooter />
    </>
  );
}; 