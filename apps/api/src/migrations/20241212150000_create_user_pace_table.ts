// Migration: create_user_pace_table
// Created: 2025-06-12T15:00:00.000Z

export const up = `
  CREATE TABLE user_pace (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    current_deadline TIMESTAMP WITH TIME ZONE,
    buffer_hours DECIMAL(10,2) DEFAULT 0,
    last_lesson_completion TIMESTAMP WITH TIME ZONE,
    last_completed_lessons DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Add unique constraint on user_id (one pace record per user)
  ALTER TABLE user_pace ADD CONSTRAINT unique_user_pace_user_id UNIQUE (user_id);
  
  -- Add indexes for performance
  CREATE INDEX idx_user_pace_user_id ON user_pace(user_id);
`;

export const down = `
  DROP INDEX IF EXISTS idx_user_pace_user_id;
  ALTER TABLE user_pace DROP CONSTRAINT IF EXISTS unique_user_pace_user_id;
  DROP TABLE IF EXISTS user_pace;
`; 