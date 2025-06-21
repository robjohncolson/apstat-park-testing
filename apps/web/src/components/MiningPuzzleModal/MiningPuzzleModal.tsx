import React, { useState } from "react";
import Modal from "../Modal/Modal";
import styles from "./MiningPuzzleModal.module.css";
import type { QuizQuestion } from "@apstatchain/core";

interface MiningPuzzleModalProps {
  isOpen: boolean;
  puzzle: QuizQuestion | null;
  onSubmit: (selectedAnswerIndex: number) => Promise<void> | void;
  onRequestClose?: () => void;
}

export const MiningPuzzleModal: React.FC<MiningPuzzleModalProps> = ({
  isOpen,
  puzzle,
  onSubmit,
  onRequestClose,
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!puzzle) return null; // Nothing to show

  const handleConfirm = async () => {
    if (selected === null) return;
    try {
      setIsSubmitting(true);
      await onSubmit(selected);
      setSelected(null);
      onRequestClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose ?? (() => {})}
      contentLabel="Mining Puzzle"
    >
      <div className={styles.wrapper}>
        <h2 className={styles.title}>🧩 Solve the Puzzle to Mine a Block</h2>
        <p className={styles.question}>{puzzle.questionText}</p>

        <ul className={styles.answers}>
          {puzzle.answers.map((answer, idx) => (
            <li key={idx} className={styles.answerItem}>
              <label>
                <input
                  type="radio"
                  name="puzzle-answer"
                  value={idx}
                  checked={selected === idx}
                  onChange={() => setSelected(idx)}
                  disabled={isSubmitting}
                />
                {answer}
              </label>
            </li>
          ))}
        </ul>

        <button
          className={styles.submitBtn}
          disabled={selected === null || isSubmitting}
          onClick={handleConfirm}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </Modal>
  );
};

export default MiningPuzzleModal; 