#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CONVEX_SELF_HOSTED_URL:-}" || -z "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ]]; then
    echo "Convex admin key is missing. Start the party with scripts/party-up.sh." >&2
    exit 1
fi

echo "Waiting for Convex at ${CONVEX_SELF_HOSTED_URL}"
ready=0
for _ in $(seq 1 60); do
    if curl -sf "${CONVEX_SELF_HOSTED_URL}/version" >/dev/null; then
        ready=1
        break
    fi
    sleep 2
done
if [[ "$ready" -ne 1 ]]; then
    echo "Convex did not become ready." >&2
    exit 1
fi

mkdir -p /secrets
if [[ ! -s /secrets/auth.env ]]; then
    node /app/scripts/generate-auth-keys.mjs /secrets/auth.env
fi
set -a
# shellcheck disable=SC1091
source /secrets/auth.env
set +a

cd /app/packages/backend
export CI=1
python3 - <<'PY'
import os
from pathlib import Path

def quote(value: str) -> str:
    # Single quotes keep JWKS JSON intact. Convex's dotenv keeps backslashes
    # from JSON-escaped double quotes, which makes the public key unreadable.
    return "'" + value.replace("'", "'\\''") + "'"

names = ["JWT_PRIVATE_KEY", "JWKS", "SITE_URL"]
Path("/tmp/convex.env").write_text(
    "".join(f"{name}={quote(os.environ[name])}\n" for name in names)
)
PY
node /app/node_modules/convex/bin/main.js env set --force --from-file /tmp/convex.env
rm -f /tmp/convex.env
node /app/node_modules/convex/bin/main.js deploy

cd /app/apps/web
/opt/venv/bin/gunicorn \
    --workers 1 \
    --timeout 120 \
    --bind 127.0.0.1:5328 \
    --chdir api/flask \
    index:app &
flask_pid=$!

node /app/node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3000 &
next_pid=$!

cleanup() {
    kill "$flask_pid" "$next_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 0' INT TERM

set +e
wait -n "$flask_pid" "$next_pid"
status=$?
set -e
exit "$status"
