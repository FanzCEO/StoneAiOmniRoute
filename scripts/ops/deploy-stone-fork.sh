#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${STONE_OMNIROUTE_REPO_URL:-https://github.com/FanzCEO/StoneAiOmniRoute.git}"
REF="${STONE_OMNIROUTE_REF:-release/v3.8.51}"
EXPECTED_SHA="${STONE_OMNIROUTE_SHA:?STONE_OMNIROUTE_SHA is required}"
WORK_ROOT="${STONE_DEPLOY_ROOT:-/opt/stone/omniroute}"
PORT="${PORT:-20128}"

mkdir -p "$WORK_ROOT/releases"
TMP="$(mktemp -d "$WORK_ROOT/releases/.deploy.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

echo "==> fetching exact Stone OmniRoute revision"
git -C "$TMP" init -q
git -C "$TMP" remote add origin "$REPO_URL"
git -C "$TMP" fetch --depth 1 origin "$EXPECTED_SHA"
git -C "$TMP" checkout -q --detach FETCH_HEAD
ACTUAL_SHA="$(git -C "$TMP" rev-parse HEAD)"
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "SHA mismatch: expected $EXPECTED_SHA got $ACTUAL_SHA" >&2
  exit 42
fi

echo "==> installing deterministic dependencies"
cd "$TMP"
npm ci --ignore-scripts=false

echo "==> focused Stone technology-fabric test"
node --import tsx/esm --test tests/unit/stone-technology-fabric.test.ts

echo "==> production build"
OMNIROUTE_BUILD_SHA="$EXPECTED_SHA" npm run build:release

RELEASE_DIR="$WORK_ROOT/releases/$EXPECTED_SHA"
rm -rf "$RELEASE_DIR"
mv "$TMP" "$RELEASE_DIR"
trap - EXIT

ln -sfn "$RELEASE_DIR" "$WORK_ROOT/current"
cd "$WORK_ROOT/current"

echo "==> restarting exact checked-out build"
pm2 delete omniroute 2>/dev/null || true
pm2 start npm --name omniroute -- start -- --port "$PORT"
pm2 save

echo "==> liveness"
ok=0
for i in $(seq 1 36); do
  BODY="$(curl -sf -m 5 "http://127.0.0.1:$PORT/api/health" 2>/dev/null || true)"
  if printf '%s' "$BODY" | grep -q '"status":"ok"'; then
    ok=1
    break
  fi
  sleep 5
done
[ "$ok" = "1" ] || { pm2 logs omniroute --lines 80 --nostream || true; exit 43; }

echo "==> technology fabric readiness"
FABRIC="$(curl -sf -m 5 "http://127.0.0.1:$PORT/api/health/technology-fabric")"
printf '%s\n' "$FABRIC"
printf '%s' "$FABRIC" | grep -q '"authority":"stone"' || exit 44

printf '%s\n' "$EXPECTED_SHA" > "$WORK_ROOT/DEPLOYED_SHA"
echo "DEPLOY_OK $EXPECTED_SHA"
