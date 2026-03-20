-- Migration: 0002_predictions.sql
CREATE TABLE IF NOT EXISTS ai_predictions (
  player_id TEXT PRIMARY KEY,
  predictions TEXT NOT NULL,
  potential_score INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
