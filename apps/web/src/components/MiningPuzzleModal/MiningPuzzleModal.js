import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Modal from "../Modal/Modal";
import styles from "./MiningPuzzleModal.module.css";
export const MiningPuzzleModal = ({ isOpen, puzzle, onSubmit, onRequestClose, }) => {
    const [selected, setSelected] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    if (!puzzle)
        return null; // Nothing to show
    const handleConfirm = async () => {
        if (selected === null)
            return;
        try {
            setIsSubmitting(true);
            await onSubmit(selected);
            setSelected(null);
            onRequestClose?.();
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onRequestClose: onRequestClose ?? (() => { }), contentLabel: "Mining Puzzle", children: _jsxs("div", { className: styles.wrapper, children: [_jsx("h2", { className: styles.title, children: "\uD83E\uDDE9 Solve the Puzzle to Mine a Block" }), _jsx("p", { className: styles.question, children: puzzle.questionText }), _jsx("ul", { className: styles.answers, children: puzzle.answers.map((answer, idx) => (_jsx("li", { className: styles.answerItem, children: _jsxs("label", { children: [_jsx("input", { type: "radio", name: "puzzle-answer", value: idx, checked: selected === idx, onChange: () => setSelected(idx), disabled: isSubmitting }), answer] }) }, idx))) }), _jsx("button", { className: styles.submitBtn, disabled: selected === null || isSubmitting, onClick: handleConfirm, children: isSubmitting ? "Submitting..." : "Submit" })] }) }));
};
export default MiningPuzzleModal;
