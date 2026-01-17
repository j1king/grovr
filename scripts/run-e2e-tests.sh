#!/bin/bash
#
# Grovr Desktop E2E Test Runner
#
# Usage:
#   ./scripts/run-e2e-tests.sh [project] [name] [port]
#
# Projects:
#   smoke     - Quick smoke tests (@smoke)
#   critical  - Critical path tests (@critical)
#   worktree  - Worktree related tests (@worktree)
#   settings  - Settings page tests (@settings)
#   all       - All tests (default)
#
# Examples:
#   ./scripts/run-e2e-tests.sh                    # Run all tests
#   ./scripts/run-e2e-tests.sh smoke              # Run smoke tests only
#   ./scripts/run-e2e-tests.sh worktree my-test 1425

set -e

PROJECT="${1:-all}"
NAME="${2:-e2e-$(date +%s)}"
PORT="${3:-$((1420 + RANDOM % 100))}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_ROOT="/tmp/grovr-test-${NAME}"

echo "=== Grovr Desktop E2E Test Runner ==="
echo "Project: $PROJECT"
echo "Test name: $NAME"
echo "Port: $PORT"
echo ""

# 1. Setup test environment
echo "[1/4] Setting up test environment..."
"$SCRIPT_DIR/setup-test-repo.sh" "$NAME" "$PORT" > /dev/null

# 2. Start dev server in background
echo "[2/4] Starting dev server..."
cd "$PROJECT_ROOT"

# Kill any existing process on the port
lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true

# Start vite dev server
npm run dev -- --port "$PORT" > "$TEST_ROOT/logs/dev.log" 2>&1 &
DEV_PID=$!
echo "Dev server PID: $DEV_PID"

# Wait for server
echo "Waiting for server..."
for i in {1..30}; do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    echo "Server ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Server failed to start!"
    kill $DEV_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# 3. Run Playwright tests
echo "[3/4] Running tests (project: $PROJECT)..."
TEST_EXIT_CODE=0
TEST_ROOT="$TEST_ROOT" \
TEST_PORT="$PORT" \
TEST_NAME="$NAME" \
TEST_URL="http://localhost:$PORT" \
npx playwright test --config=e2e/playwright.config.ts --project="$PROJECT" || TEST_EXIT_CODE=$?

# 4. Cleanup
echo "[4/4] Cleaning up..."
kill $DEV_PID 2>/dev/null || true
lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true

echo ""
echo "=== Test Results ==="
echo "Logs: $TEST_ROOT/logs/dev.log"
echo "Artifacts: $PROJECT_ROOT/test-results/"

if [ "$TEST_EXIT_CODE" -ne 0 ]; then
  echo "Status: FAILED (exit code: $TEST_EXIT_CODE)"
  exit $TEST_EXIT_CODE
else
  echo "Status: PASSED"
  rm -rf "$TEST_ROOT"
fi
