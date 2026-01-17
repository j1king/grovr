#!/bin/bash
#
# Grovr Desktop Preview Script
#
# Sets up an isolated test environment per worktree and runs the Tauri app.
# Multiple worktrees can run preview simultaneously without conflicts.
#
# Usage:
#   ./scripts/preview.sh [start|stop|status]
#
# Commands:
#   start   Start preview in background (default)
#   stop    Stop running preview and cleanup
#   status  Check if preview is running

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Allow override via environment variable for testing multiple instances
WORKTREE_NAME="${GROVR_WORKTREE_NAME:-$(basename "$PROJECT_ROOT")}"

# Generate deterministic port from worktree name (range: 3000-8999)
PORT_HASH=$(echo "$WORKTREE_NAME" | cksum | cut -d' ' -f1)
VITE_PORT=$((3000 + (PORT_HASH % 6000)))
VITE_HMR_PORT=$((VITE_PORT + 1))

# Isolated environment paths (use canonical path for macOS)
TMP_DIR="$(cd /tmp && pwd -P)"
PREVIEW_ROOT="${TMP_DIR}/grovr-preview-${WORKTREE_NAME}"
# Use unique identifier per worktree for data isolation
TAURI_IDENTIFIER="com.grovr.desktop.preview-${WORKTREE_NAME}"
TAURI_DATA_DIR="$HOME/Library/Application Support/${TAURI_IDENTIFIER}"
PID_FILE="$PREVIEW_ROOT/preview.pid"
LOG_FILE="$PREVIEW_ROOT/preview.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[preview]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[preview]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[preview]${NC} $1"
}

print_error() {
    echo -e "${RED}[preview]${NC} $1"
}

# Check if preview is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    rm -rf "$PREVIEW_ROOT"
    rm -rf "$TAURI_DATA_DIR"
    rm -rf "${TMP_DIR}/grovr-test-${WORKTREE_NAME}"
    print_success "Cleanup complete"
}

# Monitor process and cleanup on exit
monitor_and_cleanup() {
    local pid=$1
    # Wait for process to exit
    while kill -0 "$pid" 2>/dev/null; do
        sleep 1
    done
    cleanup
}

# Start preview
cmd_start() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        print_warning "Preview already running (PID: $pid)"
        print_status "Use './scripts/preview.sh stop' to stop it"
        exit 1
    fi

    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              Grovr Desktop Preview                           ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    print_status "Worktree: ${YELLOW}${WORKTREE_NAME}${NC}"
    print_status "Vite port: ${YELLOW}${VITE_PORT}${NC}"
    print_status "HMR port: ${YELLOW}${VITE_HMR_PORT}${NC}"
    print_status "Preview root: ${YELLOW}${PREVIEW_ROOT}${NC}"
    echo ""

    # 1. Install dependencies
    print_status "[1/4] Installing dependencies..."
    cd "$PROJECT_ROOT"
    pnpm install > /dev/null 2>&1

    # 2. Setup isolated environment
    print_status "[2/4] Setting up isolated environment..."
    mkdir -p "$TAURI_DATA_DIR"
    mkdir -p "$PREVIEW_ROOT/logs"

    # 3. Setup test repository
    print_status "[3/4] Creating test repositories..."
    "$SCRIPT_DIR/setup-test-repo.sh" "$WORKTREE_NAME" "$VITE_PORT" > "$PREVIEW_ROOT/logs/setup.log" 2>&1

    # Copy test settings to isolated Tauri data directory
    TEST_ROOT="${TMP_DIR}/grovr-test-${WORKTREE_NAME}"
    cp "$TEST_ROOT/config/settings.json" "$TAURI_DATA_DIR/settings.json"

    # 4. Start Tauri app in background
    print_status "[4/4] Starting Tauri app..."
    echo ""

    cd "$PROJECT_ROOT"

    # Export environment variables
    export VITE_PORT
    export VITE_HMR_PORT
    export GROVR_PREVIEW_WORKTREE="$WORKTREE_NAME"
    export VITE_PREVIEW_WORKTREE="$WORKTREE_NAME"

    # Start tauri dev with custom devUrl and unique identifier for data isolation
    TAURI_CONFIG="{\"identifier\":\"${TAURI_IDENTIFIER}\",\"build\":{\"devUrl\":\"http://localhost:${VITE_PORT}\"}}"
    pnpm tauri dev --config "$TAURI_CONFIG" > "$LOG_FILE" 2>&1 &
    local tauri_pid=$!
    echo "$tauri_pid" > "$PID_FILE"

    # Start monitor in background
    (monitor_and_cleanup "$tauri_pid") &

    # Wait for Vite to start (check if port is listening)
    print_status "Waiting for dev server to start..."
    local wait_count=0
    while ! lsof -i ":$VITE_PORT" -sTCP:LISTEN >/dev/null 2>&1; do
        sleep 1
        wait_count=$((wait_count + 1))
        if [ $wait_count -ge 60 ]; then
            print_error "Timeout waiting for dev server"
            break
        fi
        # Check if process died
        if ! kill -0 "$tauri_pid" 2>/dev/null; then
            break
        fi
    done

    sleep 2

    if is_running; then
        echo ""
        print_success "Preview started successfully!"
        echo ""
        echo "  Window title: Grovr (${WORKTREE_NAME})"
        echo "  Dev server:   http://localhost:${VITE_PORT}"
        echo "  Log file:     ${LOG_FILE}"
        echo ""
        print_status "The app is running with hot-reload enabled."
        print_status "Close the app window or run './scripts/preview.sh stop' to cleanup."
        echo ""
    else
        # Failed to start - cleanup and retry once
        if [ "${PREVIEW_RETRY:-0}" -eq 0 ]; then
            print_warning "Failed to start preview. Cleaning up and retrying..."
            cleanup
            export PREVIEW_RETRY=1
            cmd_start
        else
            print_error "Failed to start preview after retry. Check log: $LOG_FILE"
            cleanup
            exit 1
        fi
    fi
}

# Kill processes using the preview ports
kill_port_processes() {
    for port in "$VITE_PORT" "$VITE_HMR_PORT"; do
        local pids=$(lsof -ti ":$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            print_status "Killing processes on port $port..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
}

# Stop preview
cmd_stop() {
    if ! is_running; then
        print_warning "Preview is not running"
        # Kill any processes on ports anyway
        kill_port_processes
        # Cleanup any leftover files
        if [ -d "$PREVIEW_ROOT" ]; then
            cleanup
        fi
        exit 0
    fi

    local pid=$(cat "$PID_FILE")
    print_status "Stopping preview (PID: $pid)..."

    # Kill the process tree
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true

    # Wait for process to exit
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 0.5
        count=$((count + 1))
    done

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
    fi

    # Kill any remaining processes on ports
    kill_port_processes

    cleanup
    print_success "Preview stopped"
}

# Show status
cmd_status() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              Grovr Desktop Preview Status                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    print_status "Worktree: ${YELLOW}${WORKTREE_NAME}${NC}"
    print_status "Vite port: ${YELLOW}${VITE_PORT}${NC}"
    echo ""

    if is_running; then
        local pid=$(cat "$PID_FILE")
        print_success "Status: ${GREEN}RUNNING${NC} (PID: $pid)"
        echo ""
        echo "  Dev server: http://localhost:${VITE_PORT}"
        echo "  Log file:   ${LOG_FILE}"
        echo ""
        print_status "Use './scripts/preview.sh stop' to stop"
    else
        print_warning "Status: ${YELLOW}STOPPED${NC}"
        if [ -d "$PREVIEW_ROOT" ]; then
            print_warning "Orphaned files found. Run 'stop' to cleanup."
        fi
    fi
    echo ""
}

# Main
case "${1:-start}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    status)
        cmd_status
        ;;
    *)
        echo "Usage: $0 [start|stop|status]"
        exit 1
        ;;
esac
