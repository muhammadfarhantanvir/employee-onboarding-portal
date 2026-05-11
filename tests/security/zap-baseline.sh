# tests/security/zap-baseline.sh
#!/bin/bash
set -euo pipefail

mkdir -p tests/security/reports

docker run --rm --network host \
  -v "$(pwd)/tests/security/reports:/zap/wrk" \
  zaproxy/zap-stable zap-baseline.py \
  -t http://localhost:3001/api \
  -r zap-baseline-report.html \
  -I

echo "Report saved to tests/security/reports/zap-baseline-report.html"
