CREATE TABLE IF NOT EXISTS omnisight_sbom_components (
  id TEXT PRIMARY KEY,
  scan_id TEXT,
  artifact_ref TEXT,
  image_digest TEXT,
  bom_ref TEXT,
  component_type TEXT,
  name TEXT NOT NULL,
  version TEXT,
  purl TEXT,
  cpe TEXT,
  licenses_json TEXT,
  hashes_json TEXT,
  supplier TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (scan_id) REFERENCES omnisight_security_scans(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_omnisight_sbom_purl ON omnisight_sbom_components(purl);
CREATE INDEX IF NOT EXISTS idx_omnisight_sbom_name_version ON omnisight_sbom_components(name,version);
CREATE INDEX IF NOT EXISTS idx_omnisight_sbom_image ON omnisight_sbom_components(image_digest);
CREATE INDEX IF NOT EXISTS idx_omnisight_sbom_artifact ON omnisight_sbom_components(artifact_ref);
