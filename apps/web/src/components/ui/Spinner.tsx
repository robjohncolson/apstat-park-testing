import React from "react";
import styles from "./Spinner.module.css";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export function Spinner({ children = "Loading...", className = "", ...rest }: SpinnerProps) {
  const classes = [styles.spinner, className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
} 