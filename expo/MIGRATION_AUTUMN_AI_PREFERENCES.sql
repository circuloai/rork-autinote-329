-- Stores Autumn’s versioned consent and AI response preferences.
-- Safe to run after the base preferences table has been created.

ALTER TABLE preferences
  ADD COLUMN IF NOT EXISTS ai_preferences JSONB;

COMMENT ON COLUMN preferences.ai_preferences IS
  'Autumn response preferences and versioned AI consent; no chat transcript is stored here.';