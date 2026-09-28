#!/usr/bin/env bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
id stone-ci >/dev/null 2>&1 || useradd --system --home /var/lib/stone-ci --create-home --shell /usr/sbin/nologin stone-ci
install -d -o stone-ci -g stone-ci -m 0700 /var/lib/stone-ci/omniroute/receipts /etc/stone /usr/local/lib/stone-ci
install -o root -g root -m 0755 "$SRC/scripts/ops/stone-sovereign-ci.sh" /usr/local/lib/stone-ci/run-omniroute.sh
install -o root -g root -m 0644 "$SRC/ops/systemd/stone-sovereign-ci.service" /etc/systemd/system/stone-sovereign-ci.service
install -o root -g root -m 0644 "$SRC/ops/systemd/stone-sovereign-ci.timer" /etc/systemd/system/stone-sovereign-ci.timer
if [ ! -f /etc/stone/sovereign-ci.env ]; then
  cat > /etc/stone/sovereign-ci.env <<'EOF'
STONE_CI_REPO_URL=https://github.com/FanzCEO/StoneAiOmniRoute.git
STONE_CI_REF=release/v3.8.51
STONE_CI_ROOT=/var/lib/stone-ci/omniroute
EOF
  chmod 0600 /etc/stone/sovereign-ci.env
fi
systemctl daemon-reload
systemctl enable --now stone-sovereign-ci.timer
systemctl start stone-sovereign-ci.service
systemctl --no-pager status stone-sovereign-ci.timer || true
