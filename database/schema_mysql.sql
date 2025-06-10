-- APStat Park Database Schema for MySQL/PlanetScale
-- Run this in your PlanetScale console

-- Users table for tracking student accounts
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Progress table for lesson completion tracking
CREATE TABLE progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id VARCHAR(20) NOT NULL,
    videos_watched JSON DEFAULT ('[]'),
    quizzes_completed JSON DEFAULT ('[]'),
    lesson_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_lesson (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bookmarks table for saving student bookmarks
CREATE TABLE bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bookmark_type VARCHAR(20) NOT NULL,
    lesson_id VARCHAR(20) NOT NULL,
    item_index INT NULL,
    item_type VARCHAR(20) NULL,
    item_title VARCHAR(200) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_progress_user_lesson ON progress(user_id, lesson_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_users_username ON users(username); 