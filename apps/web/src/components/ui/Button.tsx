import { Link } from "react-router-dom";
import styles from "./Button.module.css";
import React from "react";

type BaseProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "linkLight";
  className?: string;
  children: React.ReactNode;
};

type ButtonRouterLink = BaseProps & {
  to: string;
  href?: never;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

type ButtonExternalLink = BaseProps & {
  href: string;
  target?: string;
  rel?: string;
  to?: never;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

type ButtonAsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & {
  to?: undefined;
  href?: undefined;
};

export type ButtonProps = ButtonRouterLink | ButtonExternalLink | ButtonAsButton;

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

  if ("href" in props && props.href) {
    return (
      <a href={props.href} className={classes} {...(rest as any)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
} 