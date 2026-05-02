#!/usr/bin/env bash
# scripts/run-backtest.sh
# Run Phase 3 backtest and save baseline JSON

set -e
cd "$(dirname "$0")/.."

echo "=== HyperScalper Phase 3 Backtest ==="
echo ""

# Ensure output dirs exist
mkdir -p tests/backtest/baselines tests/backtest/dataset

# Run the backtest runner
exec node_modules/.bin/tsx tests/backtest/runner.ts
