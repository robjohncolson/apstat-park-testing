// import { z } from 'zod'; // TODO: Add back when dependencies are installed

// Database types
export interface User {
  id: number;
  username: string;
  created_at: Date;
  last_sync: Date;
}

export interface Progress {
  id: number;
  user_id: number;
  lesson_id: string;
  videos_watched: number[];
  quizzes_completed: number[];
  /**
   * @deprecated Lesson-level completion is now tracked via videos_watched & quizzes_completed.
   * This flag remains optional for backward compatibility and will be removed in a future version.
   */
  lesson_completed?: boolean;
  completed_at?: Date;
  updated_at: Date;
}

export interface Bookmark {
  id: number;
  user_id: number;
  bookmark_type: "lesson" | "item";
  lesson_id: string;
  item_index?: number;
  item_type?: "video" | "quiz";
  item_title?: string;
  created_at: Date;
}

export interface GoldStar {
  id: number;
  user_id: number;
  total_stars: number;
  current_streak: number;
  last_lesson_time?: Date;
  last_target_hours?: number;
  updated_at: Date;
}

// Socket types
export interface SocketUser {
  username: string;
}

export interface RealtimeMessage {
  type: string;
  data: unknown;
}

export interface NotificationPayload {
  username: string;
  userId?: number;
  action?: string;
  data?: unknown;
  timestamp: string;
}

// Request/Response types (TODO: Convert to Zod schemas later)
export interface CreateUserRequest {
  username?: string;
}

/**
 * Request payload for syncing granular progress updates.
 * Client should send either a video_index or quiz_index for the given lesson.
 */
export interface SyncProgressRequest {
  lesson_id: string;
  /** Index of the video that was just watched (0-based). */
  video_index?: number;
  /** Index of the quiz that was just completed (0-based). */
  quiz_index?: number;
  /** Optional ISO date string when the item was completed. */
  completed_at?: string;
}

export interface SyncBookmarksRequest {
  bookmarks: Array<{
    bookmark_type: "lesson" | "item";
    lesson_id: string;
    item_index?: number;
    item_type?: "video" | "quiz";
    item_title?: string;
  }>;
}

export interface CompleteLessonRequest {
  lessonId: string;
  completionTime: string;
}

export interface ResetDataRequest {
  resetKey: string;
}

// Response types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  isNewUser: boolean;
}

export interface SyncResponse {
  success: boolean;
  serverProgress?: Progress[];
  serverBookmarks?: Bookmark[];
  message?: string;
}

/**
 * Represents a single user's entry on the leaderboard.
 */
export interface LeaderboardEntry {
  rank: number;
  username: string;
  completed_videos: number;
  completed_quizzes: number;
  total_completed: number;
}

export interface GoldStarResponse {
  earnedGoldStar: boolean;
  currentStreak: number;
  totalStars: number;
  timeSinceLastLesson: number;
  currentTargetHours: number;
  nextTargetHours: number;
  remainingLessons: number;
  daysUntilExam: number;
}
