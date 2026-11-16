CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false,
  iv text NOT NULL,
  ciphertext text NOT NULL,
  ip_hash text,
  ip_iv text,
  ip_ciphertext text
);
CREATE INDEX IF NOT EXISTS responses_ip_hash_idx ON responses (is_demo, ip_hash);
CREATE INDEX IF NOT EXISTS responses_created_at_idx ON responses (created_at DESC);

CREATE TABLE IF NOT EXISTS auth_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  window_start bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS site_state (
  key text PRIMARY KEY,
  value text NOT NULL
);
