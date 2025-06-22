/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useBlockchain } from "./BlockchainProvider";
import { BlockchainService } from "../services/BlockchainService";
import type { SetBookmarkData, BookmarkState } from "@apstatchain/core";

// Types
interface BookmarkItem {
  lesson_id: string;
  lesson_title: string;
  unit_id: string;
  bookmark_type: "lesson" | "item";
  item_index?: number;
  item_type?: "video" | "quiz";
  item_title?: string;
  created_at: string;
}

interface BookmarkContextType {
  activeBookmark: BookmarkItem | null;
  isLoading: boolean;

  // Actions
  setBookmark: (bookmark: Omit<BookmarkItem, "created_at">) => Promise<void>;
  clearBookmark: () => Promise<void>;
  navigateToBookmark: () => string | null; // Returns the URL to navigate to

  // Utilities
  isItemBookmarked: (
    lessonId: string,
    itemType?: "video" | "quiz",
    itemIndex?: number,
  ) => boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(
  undefined,
);

interface BookmarkProviderProps {
  children: ReactNode;
}

export function BookmarkProvider({ children }: BookmarkProviderProps) {
  const { user } = useAuth();
  const { appState } = useBlockchain();

  // Singleton blockchain service (stable identity)
  const blockchainService = useMemo(() => BlockchainService.getInstance(), []);

  // Resolve this client's public key once service is running
  const publicKey = useMemo(() => {
    try {
      return blockchainService.getPublicKey();
    } catch {
      return "";
    }
  }, [appState]);

  const [activeBookmark, setActiveBookmark] = useState<BookmarkItem | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------------------------------------------------------
  // Sync on-chain bookmark into local React state whenever the projected
  // blockchain appState changes (or when the public key becomes available).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!publicKey) {
      // Blockchain not initialised yet – try localStorage fallback once
      loadBookmarkFromStorage();
      return;
    }

    // Extract bookmarks for this user from the projected chain state
    const userBookmarks = appState.bookmarks[publicKey] ?? {};

    // Filter out bookmarks that were explicitly cleared
    const validBookmarks = Object.values(userBookmarks).filter((b) => b.note !== "__cleared__");

    // Strategy: pick the most recently created valid bookmark (by createdAt)
    const latest: BookmarkState | undefined = validBookmarks.reduce<
      BookmarkState | undefined
    >((acc, curr) => {
      if (!acc) return curr;
      return curr.createdAt > acc.createdAt ? curr : acc;
    }, undefined);

    if (latest) {
      setActiveBookmark(convertBookmarkState(latest));
    } else {
      // Fall back to persisted localStorage bookmark (offline mode)
      loadBookmarkFromStorage();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.bookmarks, publicKey]);

  // ---------------------------------------------------------------------
  // Utilities – conversions between chain and UI representations
  // ---------------------------------------------------------------------

  const convertBookmarkState = (bs: BookmarkState): BookmarkItem => {
    let extra: Partial<BookmarkItem> = {};

    // Attempt to parse JSON note field for extended data
    if (bs.note && bs.note.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(bs.note);
        extra = {
          bookmark_type: parsed.bookmark_type ?? "lesson",
          item_index: parsed.item_index,
          item_type: parsed.item_type,
          item_title: parsed.item_title,
        } as Partial<BookmarkItem>;
      } catch {
        // Ignore malformed note – treat as lesson-level bookmark
      }
    }

    const lessonId = bs.lessonId;

    return {
      lesson_id: lessonId,
      lesson_title:
        (extra.item_title as string | undefined) ?? `Lesson ${lessonId}`,
      unit_id: extractUnitId(lessonId),
      bookmark_type: (extra.bookmark_type as "lesson" | "item") ?? "lesson",
      item_index: extra.item_index,
      item_type: extra.item_type,
      item_title: extra.item_title,
      created_at: new Date(bs.createdAt).toISOString(),
    };
  };

  // Offline fallback – load bookmark from localStorage when chain is unavailable
  const loadBookmarkFromStorage = () => {
    if (!user?.id) return;

    const stored = localStorage.getItem(`bookmark_${user.id}`);
    if (stored) {
      try {
        const bookmark = JSON.parse(stored) as BookmarkItem;
        setActiveBookmark(bookmark);
      } catch {
        console.error("Failed to parse stored bookmark");
      }
    }
  };

  // No longer fetch from API – loading state now tied to blockchain sync
  useEffect(() => {
    // isLoading is true while waiting for initial sync (publicKey may be '')
    if (!publicKey) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [publicKey]);

  // Set a new bookmark (replaces any existing one)
  const setBookmark = async (bookmark: Omit<BookmarkItem, "created_at">) => {
    if (!user?.id) return;

    const newBookmark: BookmarkItem = {
      ...bookmark,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setActiveBookmark(newBookmark);

    try {
      const txData: SetBookmarkData = {
        lessonId: bookmark.lesson_id,
        page: 1, // Placeholder – exact page not tracked in current UI
        offset: bookmark.item_index ?? 0,
        note: JSON.stringify({
          bookmark_type: bookmark.bookmark_type,
          item_type: bookmark.item_type,
          item_index: bookmark.item_index,
          item_title: bookmark.item_title,
          lesson_title: bookmark.lesson_title,
        }),
        createdAt: Date.now(),
      };

      await blockchainService.submitBookmark(txData);

      // Also persist locally so the bookmark is available offline and for tests
      localStorage.setItem(`bookmark_${user.id}`, JSON.stringify(newBookmark));
    } catch (err) {
      console.warn("Blockchain not available - saving bookmark locally", err);
      localStorage.setItem(`bookmark_${user.id}`, JSON.stringify(newBookmark));
    }
  };

  // Clear the active bookmark
  const clearBookmark = async () => {
    if (!user?.id) return;

    const previous = activeBookmark; // snapshot before clearing

    // Optimistic update
    setActiveBookmark(null);

    try {
      // Send a clearing bookmark by setting note="__cleared__" – UI will ignore
      if (previous) {
        const txData: SetBookmarkData = {
          lessonId: previous.lesson_id,
          page: 1,
          offset: 0,
          note: "__cleared__",
          createdAt: Date.now(),
        };
        await blockchainService.submitBookmark(txData);

        // Remove persisted bookmark locally as well
        localStorage.removeItem(`bookmark_${user.id}`);
      }
    } catch (err) {
      console.warn("Blockchain not available - clearing bookmark locally", err);
      localStorage.removeItem(`bookmark_${user.id}`);
    }
  };

  // Generate navigation URL for the bookmark
  const navigateToBookmark = (): string | null => {
    if (!activeBookmark) return null;

    const baseUrl = `/unit/${activeBookmark.unit_id}/lesson/${activeBookmark.lesson_id}`;

    // If it's an item-level bookmark, we'll add a hash to scroll to it
    if (
      activeBookmark.bookmark_type === "item" &&
      activeBookmark.item_type &&
      activeBookmark.item_index !== undefined
    ) {
      return `${baseUrl}#${activeBookmark.item_type}-${activeBookmark.item_index}`;
    }

    return baseUrl;
  };

  // Check if a specific item is bookmarked
  const isItemBookmarked = (
    lessonId: string,
    itemType?: "video" | "quiz",
    itemIndex?: number,
  ): boolean => {
    if (!activeBookmark || activeBookmark.lesson_id !== lessonId) {
      return false;
    }

    // If checking lesson-level bookmark
    if (!itemType && !itemIndex) {
      return activeBookmark.bookmark_type === "lesson";
    }

    // If checking item-level bookmark
    return (
      activeBookmark.bookmark_type === "item" &&
      activeBookmark.item_type === itemType &&
      activeBookmark.item_index === itemIndex
    );
  };

  // Extract unit ID from lesson ID (e.g., "1-2" -> "unit1")
  const extractUnitId = (lessonId: string): string => {
    const unitNumber = lessonId.split("-")[0];
    return `unit${unitNumber}`;
  };

  const value: BookmarkContextType = {
    activeBookmark,
    isLoading,
    setBookmark,
    clearBookmark,
    navigateToBookmark,
    isItemBookmarked,
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}

// Hook to use the bookmark context
export function useBookmark() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error("useBookmark must be used within a BookmarkProvider");
  }
  return context;
}
