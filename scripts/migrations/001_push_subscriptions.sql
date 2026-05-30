-- Migration 001: push_subscriptions
-- Run once against the production/local database before deploying PWA push features.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/migrations/001_push_subscriptions.sql

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id                SERIAL PRIMARY KEY,
  endpoint          TEXT        NOT NULL UNIQUE,
  p256dh            TEXT        NOT NULL,
  auth              TEXT        NOT NULL,
  platform          TEXT,
  user_agent        TEXT,
  team_name         TEXT,
  notification_type TEXT        NOT NULL DEFAULT 'results',
  enabled           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index for fast enabled-subscription lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled
  ON public.push_subscriptions (enabled)
  WHERE enabled = TRUE;

-- Partial index for per-team notification queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_team
  ON public.push_subscriptions (team_name)
  WHERE enabled = TRUE AND team_name IS NOT NULL;
