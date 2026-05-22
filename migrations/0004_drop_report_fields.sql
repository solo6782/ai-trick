-- Migration: 0004_drop_report_fields.sql
-- Remove redundant report fields. Coach phrases (rapport) duplicate the
-- structured ScoutComments already present in the HRF; the match narrative
-- (compte_rendu) carries no development/classification signal.
-- Only notes_detaillees (sector ratings) is kept.

ALTER TABLE match_reports DROP COLUMN rapport;
ALTER TABLE match_reports DROP COLUMN compte_rendu;
