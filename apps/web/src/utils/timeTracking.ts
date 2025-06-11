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
  paceStatus: 'ahead' | 'on-track' | 'behind' | 'unknown';
  
  // Targets
  targetLessonsPerDay: number;
  targetHoursPerDay: number;
}

/**
 * Calculate comprehensive pace and timing metrics
 */
export function calculatePaceMetrics(
  completedLessons: number,
  totalLessons: number,
  examDate: Date = getDefaultExamDate()
): PaceMetrics {
  const now = new Date();
  const msUntilExam = examDate.getTime() - now.getTime();
  
  // Basic time calculations
  const daysUntilExam = Math.max(0, Math.ceil(msUntilExam / (1000 * 60 * 60 * 24)));
  const hoursUntilExam = Math.max(0, Math.ceil(msUntilExam / (1000 * 60 * 60)));
  
  const lessonsRemaining = Math.max(0, totalLessons - completedLessons);
  
  // Pace calculations
  let targetLessonsPerDay = 0;
  let targetHoursPerDay = 0;
  let lessonsPerDay = 0;
  let hoursPerLesson = 0;
  let isOnTrack = true;
  let paceStatus: 'ahead' | 'on-track' | 'behind' | 'unknown' = 'unknown';
  
  if (daysUntilExam > 0) {
    // Target pace needed
    targetLessonsPerDay = lessonsRemaining / daysUntilExam;
    
    // Assume 1.5 hours per lesson on average (adjustable)
    const estimatedHoursPerLesson = 1.5;
    targetHoursPerDay = targetLessonsPerDay * estimatedHoursPerLesson;
    hoursPerLesson = estimatedHoursPerLesson;
    
    // Current pace (if we have completion data)
    const daysElapsed = getDaysElapsed();
    if (daysElapsed > 0 && completedLessons > 0) {
      lessonsPerDay = completedLessons / daysElapsed;
    }
    
    // Determine pace status
    if (targetLessonsPerDay <= 1) {
      paceStatus = 'ahead';
      isOnTrack = true;
    } else if (targetLessonsPerDay <= 2) {
      paceStatus = 'on-track';
      isOnTrack = true;
    } else if (targetLessonsPerDay <= 3) {
      paceStatus = 'behind';
      isOnTrack = false;
    } else {
      paceStatus = 'behind';
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
    targetHoursPerDay
  };
}

/**
 * Get the default AP Statistics exam date (typically early May)
 * For 2024: May 13, 2024
 * This should be configurable in a real app
 */
export function getDefaultExamDate(): Date {
  const currentYear = new Date().getFullYear();
  let examYear = currentYear;
  
  // If we're past May, assume next year's exam
  const mayExamDate = new Date(currentYear, 4, 13); // May 13th
  if (new Date() > mayExamDate) {
    examYear = currentYear + 1;
  }
  
  return new Date(examYear, 4, 13, 8, 0, 0); // May 13th, 8:00 AM
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
  if (currentMonth < 7) { // Before August
    schoolYear = currentYear - 1;
  }
  
  return new Date(schoolYear, 7, 25); // August 25th
}

/**
 * Format pace status for display
 */
export function formatPaceStatus(metrics: PaceMetrics): string {
  switch (metrics.paceStatus) {
    case 'ahead':
      return `🎯 Ahead of schedule! ${metrics.targetLessonsPerDay.toFixed(1)} lessons/day needed`;
    case 'on-track':
      return `✅ On track! ${metrics.targetLessonsPerDay.toFixed(1)} lessons/day needed`;
    case 'behind':
      return `⚠️ Need to catch up! ${metrics.targetLessonsPerDay.toFixed(1)} lessons/day needed`;
    default:
      return '📊 Calculating pace...';
  }
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(metrics: PaceMetrics): string {
  if (metrics.daysUntilExam <= 0) {
    return '🎓 Exam day!';
  }
  
  if (metrics.daysUntilExam === 1) {
    return '🔥 1 day until exam!';
  }
  
  if (metrics.daysUntilExam <= 7) {
    return `🔥 ${metrics.daysUntilExam} days until exam!`;
  }
  
  // --- START OF CORRECTED LOGIC ---
  // For anything > 7 days, show weeks and days format
  const weeks = Math.floor(metrics.daysUntilExam / 7);
  const remainingDays = metrics.daysUntilExam % 7;
  
  if (remainingDays === 0) {
    return `📅 ${weeks} week${weeks !== 1 ? 's' : ''} until exam`;
  }
  
  return `📅 ${weeks}w ${remainingDays}d until exam`;
  // --- END OF CORRECTED LOGIC ---
}

/**
 * Get encouragement message based on progress
 */
export function getEncouragementMessage(metrics: PaceMetrics): string {
  const progressPercent = (metrics.completedLessons / metrics.totalLessons) * 100;
  
  if (progressPercent >= 90) {
    return "🌟 Almost there! You've got this!";
  } else if (progressPercent >= 75) {
    return "🔥 Strong progress! Keep it up!";
  } else if (progressPercent >= 50) {
    return "💪 Halfway there! Steady as she goes!";
  } else if (progressPercent >= 25) {
    return "🚀 Building momentum! Great start!";
  } else if (metrics.completedLessons > 0) {
    return "🌱 Every journey begins with a single step!";
  } else {
    return "✨ Ready to begin your AP Stats journey?";
  }
} 