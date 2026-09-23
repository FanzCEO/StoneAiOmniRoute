CREATE TABLE IF NOT EXISTS omnisight_runtime_workloads (
  id TEXT PRIMARY KEY,
  workload_type TEXT NOT NULL,
  workload_name TEXT NOT NULL,
  environment TEXT,
  image_ref TEXT,
  image_digest TEXT,
  artifact_ref TEXT,
  commit_sha TEXT,
  repository TEXT,
  deployment_ref TEXT,
  internet_exposed INTEGER NOT NULL DEFAULT 0,
  privileged INTEGER NOT NULL DEFAULT 0,
  identity_ref TEXT,
  metadata_json TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_omnisight_workloads_digest ON omnisight_runtime_workloads(image_digest);
CREATE INDEX IF NOT EXISTS idx_omnisight_workloads_commit ON omnisight_runtime_workloads(commit_sha);
CREATE INDEX IF NOT EXISTS idx_omnisight_workloads_repo ON omnisight_runtime_workloads(repository);
CREATE INDEX IF NOT EXISTS idx_omnisight_workloads_environment ON omnisight_runtime_workloads(environment);
