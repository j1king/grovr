#!/bin/bash
#
# Grovr Desktop Preview Script
#
# Sets up an isolated test environment and runs the Tauri app with test data.
#
# Usage:
#   ./scripts/preview.sh
#
# The script will:
#   1. Create a test git repository with sample worktrees
#   2. Configure the app to use the test project
#   3. Launch the Tauri app
#   4. Restore original settings on exit

set -e

NAME="preview-$(date +%s)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_ROOT="/tmp/grovr-desktop-test-${NAME}"

# Tauri store location (macOS)
TAURI_DATA_DIR="$HOME/Library/Application Support/com.grovr.desktop"
SETTINGS_FILE="$TAURI_DATA_DIR/settings.json"
BACKUP_FILE="$TAURI_DATA_DIR/settings.backup.json"

echo "=== Grovr Desktop Preview ==="
echo "Test environment: $TEST_ROOT"
echo ""

# Cleanup function - restore original settings
cleanup() {
    echo ""
    echo "Cleaning up..."

    # Restore original settings if backup exists
    if [ -f "$BACKUP_FILE" ]; then
        echo "Restoring original settings..."
        mv "$BACKUP_FILE" "$SETTINGS_FILE"
    fi

    # Remove test environment
    rm -rf "$TEST_ROOT"
    echo "Done!"
}
trap cleanup EXIT

# 1. Setup test environment
echo "[1/3] Setting up test environment..."
"$SCRIPT_DIR/setup-test-repo.sh" "$NAME" 1420

# 2. Configure Tauri store with test settings
echo ""
echo "[2/3] Configuring app settings..."
mkdir -p "$TAURI_DATA_DIR"

# Backup existing settings
if [ -f "$SETTINGS_FILE" ]; then
    echo "Backing up existing settings..."
    cp "$SETTINGS_FILE" "$BACKUP_FILE"
fi

# Copy test settings to Tauri store location
cp "$TEST_ROOT/config/settings.json" "$SETTINGS_FILE"
echo "Test settings applied."

# 3. Run Tauri app
echo ""
echo "[3/3] Starting Tauri app..."
echo ""
echo "Test project: sample-project"
echo "Worktrees: feature-auth, feature-ui, bugfix-123, PROJ-101, PROJ-202"
echo ""
echo "Press Ctrl+C to stop and restore original settings."
echo ""

cd "$PROJECT_ROOT"
npm run tauri dev
