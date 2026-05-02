#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/root/.pm2/logs"
FRONT_OUT="$LOG_DIR/hyperscalper-frontend-out.log"
FRONT_ERR="$LOG_DIR/hyperscalper-frontend-error.log"

for f in "$FRONT_OUT" "$FRONT_ERR"; do
  if [[ ! -f "$f" ]]; then
    echo "[monitor] missing log file: $f" >&2
    exit 1
  fi
done

echo "[monitor] watching critical incidents from:" >&2
echo "[monitor] - $FRONT_OUT" >&2
echo "[monitor] - $FRONT_ERR" >&2

# Critical-only stream, then group repeated incidents by normalized signature.
# We normalize dynamic parts (timestamps, IDs, prices, sizes, hashes, IPs) to reduce noise.
tail -n 0 -F "$FRONT_OUT" "$FRONT_ERR" \
  | stdbuf -oL grep -E -i "binance api lỗi|binance api loi|invalid symbol|auto-stop bot|live blocked|live mode bi khoa|bot error|failed to (open|close)|order 0:|insufficient margin|whitelist|server ip|khong khop whitelist|execution failed|error:" \
  | awk '
function normalize(line, s) {
  s = line
  gsub(/[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9:.+-]+/, "<TS>", s)
  gsub(/0x[0-9a-fA-F]+/, "<HEX>", s)
  gsub(/[0-9]+\.[0-9]+/, "<NUM>", s)
  gsub(/[0-9]+/, "<NUM>", s)
  gsub(/([0-9]{1,3}\.){3}[0-9]{1,3}/, "<IP>", s)
  gsub(/cloid=[^ )]+/, "cloid=<ID>", s)
  return s
}
{
  raw = $0
  sig = normalize(raw)
  count[sig] += 1
  if (!(sig in first_seen)) {
    first_seen[sig] = strftime("%Y-%m-%d %H:%M:%S")
    printf("\n[INCIDENT NEW] %s\n", first_seen[sig])
    printf("signature: %s\n", sig)
    printf("sample   : %s\n", raw)
    fflush()
  } else {
    if (count[sig] == 2 || count[sig] % 5 == 0) {
      printf("[INCIDENT REPEAT] %s | repeats=%d\n", strftime("%Y-%m-%d %H:%M:%S"), count[sig])
      printf("signature: %s\n", sig)
      printf("latest   : %s\n", raw)
      fflush()
    }
  }
}
'