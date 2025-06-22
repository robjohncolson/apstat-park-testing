import { jsx as _jsx } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import styles from "./Button.module.css";
export function Button(props) {
    const { variant = "primary", className = "", children, ...rest } = props;
    const classes = [styles.button, styles[variant], className]
        .filter(Boolean)
        .join(" ");
    if ("to" in props && props.to) {
        // Render as router link
        return (_jsx(Link, { to: props.to, className: classes, ...rest, children: children }));
    }
    if ("href" in props && props.href) {
        return (_jsx("a", { href: props.href, className: classes, ...rest, children: children }));
    }
    return (_jsx("button", { className: classes, ...rest, children: children }));
}
