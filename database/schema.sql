-- APStat Park Database Schema
-- Run this in your Neon database console to set up the tables

-- Users table for tracking student accounts
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress table for lesson completion tracking
CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(20) NOT NULL,
    videos_watched INTEGER[] DEFAULT '{}',
    quizzes_completed INTEGER[] DEFAULT '{}',
    lesson_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Bookmarks table for saving student bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bookmark_type VARCHAR(20) NOT NULL, -- 'lesson' or 'item'
    lesson_id VARCHAR(20) NOT NULL,
    item_index INTEGER, -- null for lesson bookmarks
    item_type VARCHAR(20), -- 'video' or 'quiz' for item bookmarks
    item_title VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert some test data (optional - remove if not needed)
-- INSERT INTO users (username) VALUES ('happyotter42') ON CONFLICT (username) DO NOTHING; 