// Exam Configuration
// This file contains configurable settings for AP Statistics exam scheduling

// import { calculateNextExamDate } from '../utils/dateUtils'; // Unused import

export interface ExamConfig {
  examDate: string; // ISO date string
  examYear: number;
  registrationDeadline?: string;
  practiceExamDates?: string[];
}

// Default exam configuration
export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  examDate: "2024-05-13T08:00:00.000Z", // May 13, 2024, 8:00 AM UTC
  examYear: 2024,
  registrationDeadline: "2024-03-01T23:59:59.000Z", // March 1, 2024
  practiceExamDates: [
    "2024-04-15T08:00:00.000Z", // Practice exam 1
    "2024-04-29T08:00:00.000Z", // Practice exam 2
  ],
};

/**
 * Get the current exam configuration.
 * In a real application, this could be fetched from:
 * - Environment variables
 * - Backend API
 * - Configuration management service
 * - Database settings
 */
export function getExamConfig(): ExamConfig {
  // For now, return default config
  // TODO: Implement dynamic configuration loading
  return DEFAULT_EXAM_CONFIG;
}



/**
 * Check if we're in an exam preparation period (last 30 days before exam)
 */
export function isExamPreparationPeriod(): boolean {
  const examDate = new Date(getExamConfig().examDate);
  const now = new Date();
  const thirtyDaysBeforeExam = new Date(examDate.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  return now >= thirtyDaysBeforeExam && now <= examDate;
}

/**
 * Get days until exam
 */
export function getDaysUntilExam(): number {
  const examDate = new Date(getExamConfig().examDate);
  const now = new Date();
  const msUntilExam = examDate.getTime() - now.getTime();
  
  return Math.max(0, Math.ceil(msUntilExam / (1000 * 60 * 60 * 24)));
} 