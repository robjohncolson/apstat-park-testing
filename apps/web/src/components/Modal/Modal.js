import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import ReactDOM from "react-dom";
import styles from "./modal.module.css";
const Modal = ({ isOpen, onRequestClose, children, contentLabel, ...rest }) => {
    // Ensure a portal target exists – create one on the fly if not present (e.g. in Jest/Vitest JSDOM)
    let modalRoot = document.getElementById("modal-root");
    if (!modalRoot) {
        modalRoot = document.createElement("div");
        modalRoot.setAttribute("id", "modal-root");
        document.body.appendChild(modalRoot);
    }
    // Close on ESC key
    useEffect(() => {
        if (!isOpen)
            return;
        const handleKey = (e) => {
            if (e.key === "Escape") {
                onRequestClose();
            }
        };
        document.addEventListener("keydown", handleKey);
        // Prevent background scroll
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleKey);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, onRequestClose]);
    if (!isOpen)
        return null;
    return ReactDOM.createPortal(_jsx("div", { className: styles.overlay, role: "dialog", "aria-modal": "true", "aria-label": contentLabel, onClick: onRequestClose, children: _jsxs("div", { className: styles.container, onClick: (e) => e.stopPropagation(), ...rest, children: [_jsx("button", { className: styles.closeBtn, "aria-label": "Close dialog", onClick: onRequestClose, children: "\u00D7" }), children] }) }), modalRoot);
};
export default Modal;
