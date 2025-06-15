import { Link } from "react-router-dom";
import styles from "./Button.module.css";
import React from "react";

type BaseProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "linkLight";
  className?: string;
  children: React.ReactNode;
};

type ButtonAsLink = BaseProps & {
  to: string;
  onClick?: never;
  type?: never;
};

type ButtonAsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & {
  to?: undefined;
};

export type ButtonProps = ButtonAsLink | ButtonAsButton;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    className = "",
    children,
    ...rest
  } = props as ButtonProps & Record<string, unknown>;

  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  if ("to" in props && props.to) {
    // Render as router link
    return (
      <Link to={props.to} className={classes} {...(rest as any)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
} 