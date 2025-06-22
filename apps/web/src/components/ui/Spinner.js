import { jsx as _jsx } from "react/jsx-runtime";
import styles from "./Spinner.module.css";
export function Spinner({ children = "Loading...", className = "", ...rest }) {
    const classes = [styles.spinner, className].filter(Boolean).join(" ");
    return (_jsx("div", { className: classes, ...rest, children: children }));
}
