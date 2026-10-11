CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  login_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  birth_year INTEGER,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student')),
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE user_tracks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_slug TEXT NOT NULL,
  PRIMARY KEY (user_id, track_slug)
);
