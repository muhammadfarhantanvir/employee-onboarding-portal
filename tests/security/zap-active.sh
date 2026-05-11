# tests/security/zap-active.sh
#!/bin/bash
set -euo pipefail

echo "WARNING: This runs an active security scan with attack payloads."
echo "Target: http://localhost:3001 — confirm this is your TEST environment."
read -r -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  exit 1
fi

mkdir -p tests/security/reports

docker run --rm --network host \
  -v "$(pwd)/tests/security/reports:/zap/wrk" \
  zaproxy/zap-stable zap-full-scan.py \
  -t http://localhost:3001/api \
  -r zap-active-report.html
