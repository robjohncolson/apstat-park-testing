// Migration: create_gold_stars_table
// Created: 2025-06-11T21:33:00.000Z

export const up = `
  CREATE TABLE gold_stars (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_stars INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_lesson_time TIMESTAMP WITH TIME ZONE,
    last_target_hours DECIMAL(8,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX idx_gold_stars_user ON gold_stars(user_id);
  CREATE INDEX idx_gold_stars_leaderboard ON gold_stars(current_streak DESC, total_stars DESC);
  CREATE INDEX idx_gold_stars_updated_at ON gold_stars(updated_at);
  
  -- Add constraints for data integrity
  ALTER TABLE gold_stars ADD CONSTRAINT chk_total_stars_positive CHECK (total_stars >= 0);
  ALTER TABLE gold_stars ADD CONSTRAINT chk_current_streak_positive CHECK (current_streak >= 0);
`;

export const down = `
  ALTER TABLE gold_stars DROP CONSTRAINT IF EXISTS chk_current_streak_positive;
  ALTER TABLE gold_stars DROP CONSTRAINT IF EXISTS chk_total_stars_positive;
  DROP INDEX IF EXISTS idx_gold_stars_updated_at;
  DROP INDEX IF EXISTS idx_gold_stars_leaderboard;
  DROP INDEX IF EXISTS idx_gold_stars_user;
  DROP TABLE IF EXISTS gold_stars;
`;
