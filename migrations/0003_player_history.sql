-- Migration: 0003_player_history.sql
CREATE TABLE IF NOT EXISTS player_match_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  match_id TEXT NOT NULL,
  match_date TEXT,
  position_code INTEGER,
  played_minutes INTEGER,
  rating REAL,
  hrf_date TEXT,
  UNIQUE(player_id, match_id)
);
