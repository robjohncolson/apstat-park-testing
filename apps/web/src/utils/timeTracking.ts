// timeTracking.ts
// Utilities for calculating exam countdown, pacing, and progress metrics

export interface PaceMetrics {
  daysUntilExam: number;
  hoursUntilExam: number;
  lessonsRemaining: number;
  totalLessons: number;
  completedLessons: number;

  // Pace calculations
  lessonsPerDay: number;
  hoursPerLesson: number;
  isOnTrack: boolean;
  paceStatus: "ahead" | "on-track" | "behind" | "unknown";

  // Targets
  targetLessonsPerDay: number;
  targetHoursPerDay: number;

  // Phase 1/2: Soft deadline and buffer system
  nextDeadline: Date;
  bufferHours: number;
  aheadLessons: number;
}

/**
 * Calculate comprehensive pace and timing metrics
 * Phase 2: Enhanced with soft deadline and buffer system
 */
export function calculatePaceMetrics(
  completedLessons: number,
  totalLessons: number,
  examDate: Date = getDefaultExamDate(),
  now: Date = new Date(),
  currentBufferHours: number = 0, // TODO Phase 6: Load from persistence
  lastDeadline?: Date, // TODO Phase 6: Load from persistence - the FIXED deadline for current lesson
): PaceMetrics {
  const msUntilExam = examDate.getTime() - now.getTime();

  // Basic time calculations
  const daysUntilExam = Math.max(
    0,
    Math.ceil(msUntilExam / (1000 * 60 * 60 * 24)),
  );
  const hoursUntilExam = Math.max(0, msUntilExam / (1000 * 60 * 60)); // Use fractional hours for precision

  const lessonsRemaining = Math.max(0, totalLessons - completedLessons);

  // Pace calculations
  let targetLessonsPerDay = 0;
  let targetHoursPerDay = 0;
  let lessonsPerDay = 0;
  let hoursPerLesson = 0;
  let isOnTrack = true;
  let paceStatus: "ahead" | "on-track" | "behind" | "unknown" = "unknown";

  // Phase 2: Soft deadline and buffer calculations
  let nextDeadline: Date = new Date(now); // Default fallback
  const bufferHours = currentBufferHours;
  let aheadLessons = 0;

  if (daysUntilExam > 0) {
    // Phase 2: Enhanced pace calculations
    if (lessonsRemaining > 0) {
      hoursPerLesson = hoursUntilExam / lessonsRemaining;

      // 🚨 CRITICAL BUG FIX: Use FIXED deadline, don't recalculate every second!
      if (lastDeadline) {
        // Always use existing fixed deadline (even if it has passed!)
        nextDeadline = lastDeadline;
      } else {
        // Calculate NEW fixed deadline (only when starting or after completing a lesson)
        nextDeadline = new Date(
          now.getTime() +
            hoursPerLesson * 60 * 60 * 1000 +
            bufferHours * 60 * 60 * 1000,
        );
      }

      if (hoursPerLesson > 0) {
        aheadLessons = Math.round((bufferHours / hoursPerLesson) * 10) / 10; // 1 decimal place
      }
    } else {
      // All lessons complete
      hoursPerLesson = 0;
      nextDeadline = examDate;
      // When done, buffer is measured in "days" ahead of the exam
      aheadLessons = Math.round((bufferHours / 24) * 10) / 10;
    }

    // Legacy calculations for compatibility
    targetLessonsPerDay = lessonsRemaining / daysUntilExam;

    targetHoursPerDay =
      targetLessonsPerDay * (hoursPerLesson > 0 ? hoursPerLesson : 1.5); // Use calculated or fallback

    // Current pace (if we have completion data)
    const daysElapsed = getDaysElapsed();
    if (daysElapsed > 0 && completedLessons > 0) {
      lessonsPerDay = completedLessons / daysElapsed;
    }

    // Phase 2: Enhanced pace status based on buffer
    if (aheadLessons >= 1.0) {
      paceStatus = "ahead";
      isOnTrack = true;
    } else if (aheadLessons >= -0.5) {
      paceStatus = "on-track";
      isOnTrack = true;
    } else {
      paceStatus = "behind";
      isOnTrack = false;
    }
  }

  return {
    daysUntilExam,
    hoursUntilExam,
    lessonsRemaining,
    totalLessons,
    completedLessons,
    lessonsPerDay,
    hoursPerLesson,
    isOnTrack,
    paceStatus,
    targetLessonsPerDay,
    targetHoursPerDay,
    nextDeadline,
    bufferHours,
    aheadLessons,
  };
}

/**
 * Get the default AP Statistics exam date from configuration
 * @deprecated Use getExamConfig().examDate or calculateNextExamDate() from examConfig instead
 */
export function getDefaultExamDate(): Date {
  // Import here to avoid circular dependencies
  const { calculateNextExamDate } = require('../config/examConfig');
  return calculateNextExamDate();
}

/**
 * Calculate days elapsed since a typical school year start
 * Used for current pace calculations
 */
function getDaysElapsed(): number {
  const schoolYearStart = getSchoolYearStart();
  const now = new Date();
  const msElapsed = now.getTime() - schoolYearStart.getTime();
  return Math.max(0, Math.floor(msElapsed / (1000 * 60 * 60 * 24)));
}

/**
 * Get the start of the current school year (typically late August)
 */
function getSchoolYearStart(): Date {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // If we're before August, use previous year's start
  let schoolYear = currentYear;
  if (currentMonth < 7) {
    // Before August
    schoolYear = currentYear - 1;
  }

  return new Date(schoolYear, 7, 25); // August 25th
}

/**
 * Format pace status for display
 * Phase 2: Enhanced with buffer-based status
 */
export function formatPaceStatus(metrics: PaceMetrics): string {
  switch (metrics.paceStatus) {
    case "ahead":
      return `🎯 ${Math.abs(metrics.aheadLessons).toFixed(1)} lessons ahead!`;
    case "on-track":
      return `✅ On track! ${metrics.targetLessonsPerDay.toFixed(1)} lessons/day needed`;
    case "behind":
      return `⚠️ ${Math.abs(metrics.aheadLessons).toFixed(1)} lessons behind!`;
    default:
      return "📊 Calculating pace...";
  }
}

/**
 * Phase 2: Format the soft deadline countdown
 * @param deadline The next lesson deadline
 * @param now Current time (for testing)
 * @returns Formatted countdown string (hh:mm:ss)
 */
export function formatDeadlineCountdown(
  deadline: Date,
  now: Date = new Date(),
): string {
  const msRemaining = deadline.getTime() - now.getTime();

  if (msRemaining <= 0) {
    return "⏰ Deadline passed!";
  }

  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format as hh:mm:ss
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Phase 2: Format buffer status for display
 * @param metrics Pace metrics containing buffer information
 * @returns Formatted buffer string
 */
export function formatBufferStatus(metrics: PaceMetrics): string {
  if (metrics.aheadLessons > 0) {
    return `🟢 ${metrics.aheadLessons.toFixed(1)} lessons ahead`;
  } else if (metrics.aheadLessons < 0) {
    return `🔴 ${Math.abs(metrics.aheadLessons).toFixed(1)} lessons behind`;
  } else {
    return `⚪ On pace`;
  }
}

/**
 * Phase 2: Format target pace with smart display for < 1 lesson/day
 * @param targetLessonsPerDay Target lessons per day
 * @returns Human-readable pace description
 */
export function formatTargetPace(targetLessonsPerDay: number): string {
  if (targetLessonsPerDay >= 1) {
    return `${targetLessonsPerDay.toFixed(1)} lessons/day`;
  } else if (targetLessonsPerDay > 0) {
    const daysPerLesson = Math.round(1 / targetLessonsPerDay);
    return `≈ 1 lesson every ${daysPerLesson} days`;
  } else {
    return "All lessons complete! 🎉";
  }
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(metrics: PaceMetrics): string {
  if (metrics.daysUntilExam <= 0) {
    return "📚 EXAM DAY!";
  }

  if (metrics.daysUntilExam === 1) {
    return "🔥 EXAM TOMORROW!";
  }

  if (metrics.daysUntilExam <= 7) {
    return `⚡ Final countdown: ${metrics.daysUntilExam} days!`;
  }

  // For anything > 7 days, show weeks and days format
  const weeks = Math.floor(metrics.daysUntilExam / 7);
  const remainingDays = metrics.daysUntilExam % 7;

  if (remainingDays === 0) {
    return `${weeks}w until exam`;
  }

  return `${weeks}w ${remainingDays}d until exam`;
}

/**
 * Get encouragement message based on progress
 * @param completionRatio A number between 0 and 1 representing completion percentage
 */
export function getEncouragementMessage(completionRatio: number): string {
  const progressPercent = completionRatio * 100;

  if (progressPercent >= 90) {
    return "🎉 Almost there! You're in the final stretch!";
  } else if (progressPercent >= 75) {
    return "💪 Great progress! Keep up the momentum!";
  } else if (progressPercent >= 50) {
    return "🚀 Halfway there! You're building solid foundations!";
  } else if (progressPercent >= 25) {
    return "📈 Good start! Every lesson counts!";
  } else if (completionRatio > 0) {
    return "🌱 Just getting started! The journey begins with a single step!";
  } else {
    return "🎯 Ready to begin your AP Statistics journey!";
  }
}
