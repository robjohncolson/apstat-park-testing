import styles from "./AppFooter.module.css";

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <p>
        © {new Date().getFullYear()} APStat Park. All rights reserved.
      </p>
    </footer>
  );
} 