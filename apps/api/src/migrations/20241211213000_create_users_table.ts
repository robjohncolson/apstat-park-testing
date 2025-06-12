// Migration: create_users_table
// Created: 2025-06-11T21:30:00.000Z

export const up = `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX idx_users_username ON users(username);
`;

export const down = `
  DROP INDEX IF EXISTS idx_users_username;
  DROP TABLE IF EXISTS users;
`; 