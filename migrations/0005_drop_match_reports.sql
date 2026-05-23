-- Migration: 0005_drop_match_reports.sql
-- Suppression complète des rapports de match (notes de secteur).
-- Décision: ces notes n'apportaient rien aux analyses IA (compo, promotions,
-- licenciements) ni à l'estimation des caracs (testé, sans gain). On retire
-- la fonctionnalité entièrement.

DROP TABLE IF EXISTS match_reports;
