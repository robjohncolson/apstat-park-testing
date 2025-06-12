// Migration: create_progress_table
// Created: 2025-06-11T21:31:00.000Z

export const up = `
  CREATE TABLE progress (
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

  CREATE INDEX idx_progress_user_lesson ON progress(user_id, lesson_id);
  CREATE INDEX idx_progress_lesson_completed ON progress(lesson_completed);
  CREATE INDEX idx_progress_updated_at ON progress(updated_at);
`;

export const down = `
  DROP INDEX IF EXISTS idx_progress_updated_at;
  DROP INDEX IF EXISTS idx_progress_lesson_completed;
  DROP INDEX IF EXISTS idx_progress_user_lesson;
  DROP TABLE IF EXISTS progress;
`; 