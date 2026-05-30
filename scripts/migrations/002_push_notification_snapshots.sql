-- Migration 002: push_notification_snapshots
-- Stores the last-seen state of each watched data set.
-- The notify cron compares current DB state against these snapshots
-- and sends push notifications only when something actually changed.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/migrations/002_push_notification_snapshots.sql

CREATE TABLE IF NOT EXISTS public.push_notification_snapshots (
  key        TEXT        PRIMARY KEY,
  snapshot   TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the two known snapshot keys with empty values so the first cron run
-- stores the initial state without firing notifications.
INSERT INTO public.push_notification_snapshots (key, snapshot)
VALUES
  ('league_top10',       ''),
  ('reservations_top10', '')
ON CONFLICT (key) DO NOTHING;
