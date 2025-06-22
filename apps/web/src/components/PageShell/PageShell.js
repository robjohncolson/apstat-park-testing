import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import styles from "./PageShell.module.css";
import { AppHeader } from "../AppHeader/AppHeader";
import { AppFooter } from "../AppFooter/AppFooter";
export const PageShell = ({ fluid = false, className = "", children, }) => {
    const containerClass = fluid ? styles.fluid : styles.container;
    return (_jsxs(_Fragment, { children: [_jsx(AppHeader, {}), _jsx("main", { className: `${containerClass} ${className}`, children: children }), _jsx(AppFooter, {})] }));
};
