#!/usr/bin/env bash
set -euo pipefail

if [ ! -d dist ]; then
  echo "dist/ not found. Run: npm run prepareDist or npm run build" >&2
  exit 1
fi

port="$(
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

python3 -m http.server "$port" --directory dist >/tmp/local-dist-smoke.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" >/dev/null 2>&1 || true; wait "$server_pid" 2>/dev/null || true' EXIT

sleep 1
bash scripts/smoke_test_routes.sh "http://127.0.0.1:${port}"
