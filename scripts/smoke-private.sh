#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env.smoke" ]]; then
  echo "[smoke-private] Missing .env.smoke. Create it from .env.smoke.example" >&2
  exit 21
fi

set -a
# shellcheck disable=SC1091
source .env.smoke
set +a

npm run smoke:multi-exchange:private
