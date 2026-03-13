-- Migration: 0001_init.sql
-- Database schema for ai-trick

CREATE TABLE IF NOT EXISTS hrf_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_reports (
  match_id TEXT PRIMARY KEY,
  match_date TEXT,
  rapport TEXT,
  compte_rendu TEXT,
  notes_detaillees TEXT,
  saved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
