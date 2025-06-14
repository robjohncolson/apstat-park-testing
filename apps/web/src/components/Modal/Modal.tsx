import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import styles from "./modal.module.css";

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /** optional accessible label */
  contentLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onRequestClose,
  children,
  contentLabel,
  ...rest
}) => {
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
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

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={contentLabel}
      onClick={onRequestClose}
    >
      <div
        className={styles.container}
        onClick={(e) => e.stopPropagation()}
        {...rest}
      >
        <button
          className={styles.closeBtn}
          aria-label="Close dialog"
          onClick={onRequestClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    modalRoot,
  );
};

export default Modal; 