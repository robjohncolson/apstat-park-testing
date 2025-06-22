/*
 * State projection engine for APStat Chain
 * ----------------------------------------
 * This module transforms the raw blockchain (array of blocks + txs)
 * into a concise, query-friendly AppState object for the UI layer.
 */

import type {
  Block,
  Transaction,
  CreateUserData,
  SetBookmarkData,
  AwardStarData,
  PaceUpdateData,
  LessonProgressData,
} from './types.js';

// ──────────────────────────────────────────
// Projected State Interfaces (approved)
// ──────────────────────────────────────────

export interface UserState {
  publicKey: string;
  username: string;
  displayName?: string;
  createdAt: number;
}

export interface BookmarkState {
  lessonId: string;
  page: number;
  offset?: number;
  note?: string;
  createdAt: number;
}

export interface PaceState {
  lessonsCompleted: number;
  totalLessons: number;
  targetDate: string; // ISO YYYY-MM-DD
  updatedAt: number;
}

export interface LeaderboardEntry {
  publicKey: string;
  username: string;
  lessonsCompleted: number;
  goldStars: number;
  silverStars: number;
  bronzeStars: number;
  totalPoints: number;
  rank: number;
}

export interface AppState {
  users: Record<string, UserState>;
  // bookmarks[publicKey][lessonId] → BookmarkState
  bookmarks: Record<string, Record<string, BookmarkState>>;
  pace: Record<string, PaceState>;

  starCounts: Record<string, { gold: number; silver: number; bronze: number }>;
  // lessonProgress[publicKey] → set of lessonIds
  lessonProgress: Record<string, Set<string>>;

  leaderboard: LeaderboardEntry[];
}

// ──────────────────────────────────────────
// Main projection function
// ──────────────────────────────────────────

export function recomputeState(blocks: Block[]): AppState {
  const state: AppState = {
    users: {},
    bookmarks: {},
    pace: {},
    starCounts: {},
    lessonProgress: {},
    leaderboard: [],
  };

  // Helper to ensure a star tally object exists
  const ensureStarTally = (pk: string) => {
    if (!state.starCounts[pk]) {
      state.starCounts[pk] = { gold: 0, silver: 0, bronze: 0 };
    }
  };

  // Iterate every transaction in every block (chronological order preserved)
  for (const block of blocks) {
    for (const tx of block.transactions) {
      const pk = tx.publicKey;

      switch (tx.type) {
        case 'CREATE_USER': {
          const data = tx.data as CreateUserData;
          state.users[pk] = {
            publicKey: pk,
            username: data.username,
            displayName: data.displayName,
            createdAt: data.createdAt,
          };
          break;
        }

        case 'USER_CREATE': {
          // legacy tx type ‑ map into the same structure (if still present)
          const data = tx.data as any as CreateUserData;
          state.users[pk] = {
            publicKey: pk,
            username: data.username,
            displayName: data.displayName,
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.parse(data.createdAt),
          };
          break;
        }

        case 'SET_BOOKMARK': {
          const data = tx.data as SetBookmarkData;
          if (!state.bookmarks[pk]) state.bookmarks[pk] = {};
          state.bookmarks[pk][data.lessonId] = {
            lessonId: data.lessonId,
            page: data.page,
            offset: data.offset,
            note: data.note,
            createdAt: data.createdAt,
          };
          break;
        }

        case 'PACE_UPDATE': {
          const data = tx.data as PaceUpdateData;
          state.pace[pk] = {
            lessonsCompleted: data.lessonsCompleted,
            totalLessons: data.totalLessons,
            targetDate: data.targetDate,
            updatedAt: data.updatedAt,
          };
          break;
        }

        case 'LESSON_PROGRESS': {
          const data = tx.data as LessonProgressData;
          if (!state.lessonProgress[pk]) state.lessonProgress[pk] = new Set<string>();
          // Only count a lesson as completed once it's marked completed; fallback: always add
          state.lessonProgress[pk].add(data.lessonId);
          break;
        }

        case 'AWARD_STAR': {
          const data = tx.data as AwardStarData;
          // Star is awarded to data.toPublicKey (not signer)
          const recipientPk = data.toPublicKey;
          ensureStarTally(recipientPk);
          state.starCounts[recipientPk][data.starType] += 1;
          break;
        }

        // Other tx types are ignored for state projection in V1
        default:
          break;
      }
    }
  }

  // ────────────────────
  // Build the leaderboard
  // ────────────────────
  const leaderboard: LeaderboardEntry[] = [];
  const userKeys = new Set<string>([
    ...Object.keys(state.users),
    ...Object.keys(state.lessonProgress),
    ...Object.keys(state.starCounts),
  ]);

  for (const pk of userKeys) {
    const user = state.users[pk];
    const username = user?.username ?? pk.slice(0, 8); // fallback to key snippet

    const stars = state.starCounts[pk] ?? { gold: 0, silver: 0, bronze: 0 };
    const lessonsCompleted = state.lessonProgress[pk]?.size ?? 0;
    const totalPoints = stars.gold * 3 + stars.silver * 2 + stars.bronze;

    leaderboard.push({
      publicKey: pk,
      username,
      lessonsCompleted,
      goldStars: stars.gold,
      silverStars: stars.silver,
      bronzeStars: stars.bronze,
      totalPoints,
      rank: 0, // temp – will assign next
    });
  }

  // Sort and assign ranks
  leaderboard.sort((a, b) => {
    const pointsDiff = b.totalPoints - a.totalPoints;
    if (pointsDiff !== 0) return pointsDiff;
    return b.lessonsCompleted - a.lessonsCompleted;
  });

  leaderboard.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  state.leaderboard = leaderboard;

  return state;
} 