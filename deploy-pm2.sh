#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

deployment_id="${NEXT_DEPLOYMENT_ID:-$(date -u +%Y%m%d%H%M%S)}"
export NEXT_DEPLOYMENT_ID="$deployment_id"

echo "Using NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID"

# Build vào thư mục staging trước — PM2 vẫn serve .next cũ trong lúc build
export NEXT_DIST_DIR=.next_new
rm -rf .next_new
npm run build

# Reset tsconfig.json — Next.js tự thêm .next_new entries khi dùng custom distDir
python3 -c "
import json, sys
with open('tsconfig.json') as f: c = json.load(f)
c['include'] = [x for x in c.get('include', []) if '.next_new' not in x]
with open('tsconfig.json', 'w') as f: json.dump(c, f, indent=2)
print('tsconfig.json cleaned')
"

# Atomic swap: chỉ xóa .next cũ SAU KHI build xong
rm -rf .next_old
[ -d .next ] && mv .next .next_old
mv .next_new .next

if pm2 describe hyperscalper-frontend >/dev/null 2>&1; then
  pm2 restart ecosystem.config.js --only hyperscalper-frontend --update-env
else
  pm2 start ecosystem.config.js --only hyperscalper-frontend --update-env
fi

# Dọn backup sau khi restart thành công
rm -rf .next_old
rm -rf .next_old