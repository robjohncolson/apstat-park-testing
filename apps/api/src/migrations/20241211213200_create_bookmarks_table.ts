// Migration: create_bookmarks_table
// Created: 2025-06-11T21:32:00.000Z

export const up = `
  CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bookmark_type VARCHAR(20) NOT NULL,
    lesson_id VARCHAR(20) NOT NULL,
    item_index INTEGER,
    item_type VARCHAR(20),
    item_title VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
  CREATE INDEX idx_bookmarks_lesson ON bookmarks(lesson_id);
  CREATE INDEX idx_bookmarks_type ON bookmarks(bookmark_type);
  CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at);
`;

export const down = `
  DROP INDEX IF EXISTS idx_bookmarks_created_at;
  DROP INDEX IF EXISTS idx_bookmarks_type;
  DROP INDEX IF EXISTS idx_bookmarks_lesson;
  DROP INDEX IF EXISTS idx_bookmarks_user;
  DROP TABLE IF EXISTS bookmarks;
`;
