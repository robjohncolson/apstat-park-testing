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
  lesson_completed: boolean;
  completed_at?: Date;
  updated_at: Date;
}

export interface Bookmark {
  id: number;
  user_id: number;
  bookmark_type: 'lesson' | 'item';
  lesson_id: string;
  item_index?: number;
  item_type?: 'video' | 'quiz';
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

export interface SyncProgressRequest {
  progress: Array<{
    lesson_id: string;
    videos_watched: number[];
    quizzes_completed: number[];
    lesson_completed: boolean;
    completed_at?: string;
  }>;
}

export interface SyncBookmarksRequest {
  bookmarks: Array<{
    bookmark_type: 'lesson' | 'item';
    lesson_id: string;
    item_index?: number;
    item_type?: 'video' | 'quiz';
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

export interface LeaderboardEntry {
  username: string;
  totalStars: number;
  currentStreak: number;
  lastActive: Date;
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