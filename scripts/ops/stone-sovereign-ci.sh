#!/usr/bin/env bash
set -euo pipefail

# Stone sovereign CI runner.
# Validates an exact repository SHA on self-hosted infrastructure without GitHub Actions.
# It does not deploy. A separate authorized deployment process may consume a PASS receipt.

REPO_URL="${STONE_CI_REPO_URL:-https://github.com/FanzCEO/StoneAiOmniRoute.git}"
REF="${STONE_CI_REF:-release/v3.8.51}"
EXPECTED_SHA="${STONE_CI_SHA:-}"
ROOT="${STONE_CI_ROOT:-/var/lib/stone-ci/omniroute}"
RECEIPTS="${STONE_CI_RECEIPTS:-$ROOT/receipts}"
LOCK_FILE="${STONE_CI_LOCK:-$ROOT/stone-ci.lock}"
KEEP_WORKSPACES="${STONE_CI_KEEP_WORKSPACES:-0}"

mkdir -p "$ROOT/work" "$RECEIPTS"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "STONE_CI_BUSY another validation is already running" >&2
  exit 75
fi

if [ -z "$EXPECTED_SHA" ]; then
  EXPECTED_SHA="$(git ls-remote "$REPO_URL" "refs/heads/$REF" | awk 'NR==1{print $1}')"
fi
if ! printf '%s' "$EXPECTED_SHA" | grep -qE '^[0-9a-f]{40}$'; then
  echo "Invalid or unresolved SHA: $EXPECTED_SHA" >&2
  exit 64
fi

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-${EXPECTED_SHA:0:12}"
WORK="$ROOT/work/$RUN_ID"
LOG="$RECEIPTS/$RUN_ID.log"
RECEIPT="$RECEIPTS/$RUN_ID.json"
STARTED="$(date -u +%FT%TZ)"
HOST="$(hostname -f 2>/dev/null || hostname)"
STATUS="FAIL"
EXIT_CODE=1
FAILED_STEP="bootstrap"

cleanup() {
  if [ "$KEEP_WORKSPACES" != "1" ]; then rm -rf "$WORK"; fi
}
trap cleanup EXIT

mkdir -p "$WORK"
set +e
{
  echo "== Stone Sovereign CI =="
  echo "run_id=$RUN_ID"
  echo "host=$HOST"
  echo "ref=$REF"
  echo "expected_sha=$EXPECTED_SHA"
  echo "started=$STARTED"

  FAILED_STEP="fetch"
  git -C "$WORK" init -q || exit $?
  git -C "$WORK" remote add origin "$REPO_URL" || exit $?
  git -C "$WORK" fetch --depth 1 origin "$EXPECTED_SHA" || exit $?
  git -C "$WORK" checkout -q --detach FETCH_HEAD || exit $?
  ACTUAL_SHA="$(git -C "$WORK" rev-parse HEAD)"
  [ "$ACTUAL_SHA" = "$EXPECTED_SHA" ] || { echo "SHA mismatch: $ACTUAL_SHA" >&2; exit 42; }

  cd "$WORK" || exit $?

  FAILED_STEP="install"
  npm ci --no-audit --no-fund || exit $?

  FAILED_STEP="migration-collision-check"
  node --input-type=module <<'NODE'
import fs from "node:fs";
const dir="src/lib/db/migrations";
const files=fs.readdirSync(dir).filter((f)=>/^\d+_.*\.sql$/.test(f));
const by=new Map();
for(const file of files){
  const n=file.match(/^(\d+)_/)[1];
  const list=by.get(n) ?? [];
  list.push(file);
  by.set(n,list);
}
const collisions=[...by.entries()].filter(([,list])=>list.length>1);
if(collisions.length){ console.error("Migration collisions:",JSON.stringify(collisions)); process.exit(1); }
for(const n of ["176","177","178","179"]){
  const matches=files.filter((f)=>f.startsWith(n+"_omnisight_"));
  if(matches.length!==1){ console.error("Expected one OmniSight migration at",n,"found",matches); process.exit(1); }
}
console.log("OmniSight migration slots 176-179 unique");
NODE
  [ $? -eq 0 ] || exit $?

  FAILED_STEP="typecheck"
  npm run typecheck:core || exit $?

  FAILED_STEP="focused-tests"
  npx vitest run --config vitest.config.ts \
    tests/unit/security/omnisight-code-security.test.ts \
    tests/unit/security/omnisight-ingest.test.ts \
    tests/unit/security/omnisight-exceptions.test.ts \
    tests/unit/sovereign-routing.test.ts || exit $?

  FAILED_STEP="native-gate-parse"
  node --check scripts/security/omnisight-gate.mjs || exit $?

  FAILED_STEP="release-green-quick"
  node scripts/quality/validate-release-green.mjs --json --hermetic --quick > "$RECEIPTS/$RUN_ID.release-green.json" || exit $?

  STATUS="PASS"
  EXIT_CODE=0
  FAILED_STEP=""
} > >(tee "$LOG") 2>&1
EXIT_CODE=$?
set -e

[ "$EXIT_CODE" -eq 0 ] && STATUS="PASS" || STATUS="FAIL"
ENDED="$(date -u +%FT%TZ)"
LOG_SHA256="$(sha256sum "$LOG" | awk '{print $1}')"
RG_FILE="$RECEIPTS/$RUN_ID.release-green.json"
RG_SHA256=""
[ -f "$RG_FILE" ] && RG_SHA256="$(sha256sum "$RG_FILE" | awk '{print $1}')"

export RUN_ID HOST REF EXPECTED_SHA STARTED ENDED STATUS EXIT_CODE FAILED_STEP LOG LOG_SHA256 RG_FILE RG_SHA256 RECEIPT
node --input-type=module <<'NODE'
import fs from "node:fs";
const receipt={
  schema:"stone.validation-receipt/v1",
  system:"StoneAiOmniRoute",
  validator:"sovereign-ci",
  runId:process.env.RUN_ID,
  host:process.env.HOST,
  ref:process.env.REF,
  sha:process.env.EXPECTED_SHA,
  startedAt:process.env.STARTED,
  endedAt:process.env.ENDED,
  status:process.env.STATUS,
  exitCode:Number(process.env.EXIT_CODE),
  failedStep:process.env.FAILED_STEP,
  evidence:{log:process.env.LOG,logSha256:process.env.LOG_SHA256,releaseGreen:process.env.RG_FILE,releaseGreenSha256:process.env.RG_SHA256}
};
fs.writeFileSync(process.env.RECEIPT,JSON.stringify(receipt,null,2)+"\n");
NODE

RECEIPT_SHA256="$(sha256sum "$RECEIPT" | awk '{print $1}')"
printf '%s  %s\n' "$RECEIPT_SHA256" "$RECEIPT" > "$RECEIPT.sha256"
echo "STONE_CI_RESULT status=$STATUS sha=$EXPECTED_SHA receipt=$RECEIPT receipt_sha256=$RECEIPT_SHA256"
exit "$EXIT_CODE"
