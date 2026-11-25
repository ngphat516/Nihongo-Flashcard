CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  token_version INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE decks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  new_per_day INT NOT NULL DEFAULT 20 CHECK (new_per_day BETWEEN 0 AND 999),
  color TEXT NOT NULL CHECK (color IN ('pink', 'peach', 'yellow', 'green', 'sky', 'lavender')),
  direction TEXT NOT NULL DEFAULT 'ja-vi' CHECK (direction IN ('ja-vi', 'vi-ja')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (id, user_id)
);
CREATE INDEX decks_user_idx ON decks (user_id);

CREATE TABLE cards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL,
  term TEXT NOT NULL CHECK (char_length(term) BETWEEN 1 AND 2000),
  meaning TEXT NOT NULL CHECK (char_length(meaning) BETWEEN 1 AND 2000),
  reading TEXT NOT NULL DEFAULT '' CHECK (char_length(reading) <= 2000),
  example TEXT NOT NULL DEFAULT '' CHECK (char_length(example) <= 2000),
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
  due BIGINT NOT NULL DEFAULT 0,
  interval REAL NOT NULL DEFAULT 0 CHECK (interval >= 0),
  ease REAL NOT NULL DEFAULT 0 CHECK (ease >= 0),
  step INT NOT NULL DEFAULT 0 CHECK (step >= 0),
  reps INT NOT NULL DEFAULT 0 CHECK (reps >= 0),
  lapses INT NOT NULL DEFAULT 0 CHECK (lapses >= 0),
  last_review BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (deck_id, user_id) REFERENCES decks(id, user_id) ON DELETE CASCADE
);
CREATE INDEX cards_deck_idx ON cards (user_id, deck_id);
CREATE INDEX cards_due_idx ON cards (user_id, due);

-- Xóa thẻ hoặc bộ vẫn giữ lịch sử ôn, nên card_id và deck_id ở đây không có FK.
CREATE TABLE review_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL,
  deck_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
  prev_state TEXT NOT NULL CHECK (prev_state IN ('new', 'learning', 'review', 'relearning')),
  prev_interval REAL NOT NULL,
  new_interval REAL NOT NULL,
  prev_ease REAL NOT NULL,
  reviewed_at BIGINT NOT NULL,
  time_ms INT NOT NULL DEFAULT 0 CHECK (time_ms BETWEEN 0 AND 86400000)
);
CREATE INDEX logs_time_idx ON review_logs (user_id, reviewed_at);
CREATE INDEX logs_card_idx ON review_logs (user_id, card_id);
