import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import styles from "./Card.module.css";
export const Card = forwardRef(({ className = "", children, ...rest }, ref) => {
    const classes = [styles.card, className].filter(Boolean).join(" ");
    return (_jsx("div", { ref: ref, className: classes, ...rest, children: children }));
});
Card.displayName = "Card";
