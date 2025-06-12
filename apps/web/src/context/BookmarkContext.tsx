import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Types
interface BookmarkItem {
  lesson_id: string;
  lesson_title: string;
  unit_id: string;
  bookmark_type: 'lesson' | 'item';
  item_index?: number;
  item_type?: 'video' | 'quiz';
  item_title?: string;
  created_at: string;
}

interface BookmarkContextType {
  activeBookmark: BookmarkItem | null;
  isLoading: boolean;
  
  // Actions
  setBookmark: (bookmark: Omit<BookmarkItem, 'created_at'>) => Promise<void>;
  clearBookmark: () => Promise<void>;
  navigateToBookmark: () => string | null; // Returns the URL to navigate to
  
  // Utilities
  isItemBookmarked: (lessonId: string, itemType?: 'video' | 'quiz', itemIndex?: number) => boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

interface BookmarkProviderProps {
  children: ReactNode;
}

export function BookmarkProvider({ children }: BookmarkProviderProps) {
  const { user } = useAuth();
  const [activeBookmark, setActiveBookmark] = useState<BookmarkItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's bookmark on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadBookmark();
    } else {
      setActiveBookmark(null);
    }
  }, [user?.id]);

  // Load bookmark from API
  const loadBookmark = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
              const response = await fetch(`http://localhost:3000/api/users/${user.id}/bookmarks`);
      if (response.ok) {
        const data = await response.json();
        // We only support one bookmark, so take the first one
        const bookmark = data.bookmarks?.[0];
        if (bookmark) {
          setActiveBookmark({
            lesson_id: bookmark.lesson_id,
            lesson_title: bookmark.item_title || `Lesson ${bookmark.lesson_id}`,
            unit_id: extractUnitId(bookmark.lesson_id),
            bookmark_type: bookmark.bookmark_type,
            item_index: bookmark.item_index,
            item_type: bookmark.item_type,
            item_title: bookmark.item_title,
            created_at: bookmark.created_at,
          });
        } else {
          setActiveBookmark(null);
        }
      } else {
        console.warn('Failed to load bookmarks - checking localStorage');
        loadBookmarkFromStorage();
      }
    } catch (error) {
      console.warn('API not available - checking localStorage');
      loadBookmarkFromStorage();
    } finally {
      setIsLoading(false);
    }
  };

  // Load bookmark from localStorage (offline mode)
  const loadBookmarkFromStorage = () => {
    if (!user?.id) return;
    
    const stored = localStorage.getItem(`bookmark_${user.id}`);
    if (stored) {
      try {
        const bookmark = JSON.parse(stored);
        setActiveBookmark(bookmark);
      } catch (error) {
        console.error('Failed to parse stored bookmark:', error);
      }
    }
  };

  // Set a new bookmark (replaces any existing one)
  const setBookmark = async (bookmark: Omit<BookmarkItem, 'created_at'>) => {
    if (!user?.id) return;

    const newBookmark: BookmarkItem = {
      ...bookmark,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setActiveBookmark(newBookmark);

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/bookmarks/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarks: [{
            bookmark_type: bookmark.bookmark_type,
            lesson_id: bookmark.lesson_id,
            item_index: bookmark.item_index,
            item_type: bookmark.item_type,
            item_title: bookmark.item_title || bookmark.lesson_title,
          }]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync bookmark');
      }

      console.log('Bookmark synced successfully');
    } catch (error) {
      console.warn('API not available - saving bookmark locally');
      localStorage.setItem(`bookmark_${user.id}`, JSON.stringify(newBookmark));
    }
  };

  // Clear the active bookmark
  const clearBookmark = async () => {
    if (!user?.id) return;

    // Optimistic update
    setActiveBookmark(null);

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/bookmarks/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarks: [] // Empty array clears all bookmarks
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear bookmark');
      }

      console.log('Bookmark cleared successfully');
    } catch (error) {
      console.warn('API not available - clearing bookmark locally');
      localStorage.removeItem(`bookmark_${user.id}`);
    }
  };

  // Generate navigation URL for the bookmark
  const navigateToBookmark = (): string | null => {
    if (!activeBookmark) return null;

    const baseUrl = `/unit/${activeBookmark.unit_id}/lesson/${activeBookmark.lesson_id}`;
    
    // If it's an item-level bookmark, we'll add a hash to scroll to it
    if (activeBookmark.bookmark_type === 'item' && 
        activeBookmark.item_type && 
        activeBookmark.item_index !== undefined) {
      return `${baseUrl}#${activeBookmark.item_type}-${activeBookmark.item_index}`;
    }

    return baseUrl;
  };

  // Check if a specific item is bookmarked
  const isItemBookmarked = (lessonId: string, itemType?: 'video' | 'quiz', itemIndex?: number): boolean => {
    if (!activeBookmark || activeBookmark.lesson_id !== lessonId) {
      return false;
    }

    // If checking lesson-level bookmark
    if (!itemType && !itemIndex) {
      return activeBookmark.bookmark_type === 'lesson';
    }

    // If checking item-level bookmark
    return activeBookmark.bookmark_type === 'item' &&
           activeBookmark.item_type === itemType &&
           activeBookmark.item_index === itemIndex;
  };

  // Extract unit ID from lesson ID (e.g., "1-2" -> "unit1")
  const extractUnitId = (lessonId: string): string => {
    const unitNumber = lessonId.split('-')[0];
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
    throw new Error('useBookmark must be used within a BookmarkProvider');
  }
  return context;
} 