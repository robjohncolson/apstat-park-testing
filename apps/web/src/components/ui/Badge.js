import { jsx as _jsx } from "react/jsx-runtime";
import styles from "./Badge.module.css";
export function Badge({ variant = "info", className = "", children }) {
    const classes = [styles.badge, styles[variant], className]
        .filter(Boolean)
        .join(" ");
    return _jsx("span", { className: classes, children: children });
}
