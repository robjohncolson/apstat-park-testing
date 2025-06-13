// Migration: add_blooket_origami_columns
// Created: 2025-06-12T00:00:00.000Z

export const up = `
  ALTER TABLE progress 
  ADD COLUMN blooket_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN origami_completed BOOLEAN DEFAULT FALSE;

  CREATE INDEX idx_progress_blooket_completed ON progress(blooket_completed);
  CREATE INDEX idx_progress_origami_completed ON progress(origami_completed);
`;

export const down = `
  DROP INDEX IF EXISTS idx_progress_origami_completed;
  DROP INDEX IF EXISTS idx_progress_blooket_completed;
  ALTER TABLE progress 
  DROP COLUMN IF EXISTS origami_completed,
  DROP COLUMN IF EXISTS blooket_completed;
`;
