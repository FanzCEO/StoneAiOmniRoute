CREATE TABLE IF NOT EXISTS omnisight_security_exceptions (
  id TEXT PRIMARY KEY,
  finding_id TEXT,
  fingerprint TEXT,
  reason TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'finding',
  approved_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_omnisight_exceptions_finding ON omnisight_security_exceptions(finding_id);
CREATE INDEX IF NOT EXISTS idx_omnisight_exceptions_fingerprint ON omnisight_security_exceptions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_omnisight_exceptions_expiry ON omnisight_security_exceptions(expires_at);
