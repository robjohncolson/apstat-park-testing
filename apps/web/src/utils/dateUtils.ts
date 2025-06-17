/**
 * Date utility functions for exam scheduling and date calculations.
 * This module is dependency-free to avoid circular imports.
 */

/**
 * Calculate the next AP Statistics exam date based on the current year.
 * AP Statistics exam is typically held in early May.
 */
export function calculateNextExamDate(): Date {
  const currentYear = new Date().getFullYear();
  let examYear = currentYear;

  // If we're past May, assume next year's exam
  const mayExamDate = new Date(currentYear, 4, 13, 8, 0, 0); // May 13th, 8:00 AM
  if (new Date() > mayExamDate) {
    examYear = currentYear + 1;
  }

  return new Date(examYear, 4, 13, 8, 0, 0); // May 13th, 8:00 AM
} 