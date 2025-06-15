import React from "react";
import styles from "./Card.module.css";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", children, ...rest }, ref) => {
    const classes = [styles.card, className].filter(Boolean).join(" ");
    return (
      <div ref={ref} className={classes} {...rest}>
        {children}
      </div>
    );
  },
);

Card.displayName = "Card"; 