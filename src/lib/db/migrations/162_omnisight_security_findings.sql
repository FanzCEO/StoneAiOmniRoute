CREATE TABLE IF NOT EXISTS omnisight_security_scans (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  artifact_ref TEXT,
  commit_sha TEXT,
  image_digest TEXT,
  policy_json TEXT NOT NULL,
  allowed INTEGER NOT NULL,
  blocking_count INTEGER NOT NULL DEFAULT 0,
  advisory_count INTEGER NOT NULL DEFAULT 0,
  summary_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS omnisight_security_findings (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  fingerprint TEXT,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location_json TEXT,
  cve_json TEXT,
  fix_available INTEGER NOT NULL DEFAULT 0,
  fix_version TEXT,
  evidence_json TEXT,
  disposition TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (scan_id) REFERENCES omnisight_security_scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_omnisight_scans_created ON omnisight_security_scans(created_at);
CREATE INDEX IF NOT EXISTS idx_omnisight_findings_scan ON omnisight_security_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_omnisight_findings_severity ON omnisight_security_findings(severity);
CREATE INDEX IF NOT EXISTS idx_omnisight_findings_fingerprint ON omnisight_security_findings(fingerprint);
CREATE INDEX IF NOT EXISTS idx_omnisight_findings_finding_id ON omnisight_security_findings(finding_id);
