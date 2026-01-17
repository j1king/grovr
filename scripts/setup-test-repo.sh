#!/bin/bash
#
# Grovr Desktop Test Repository Setup Script
#
# Creates multiple sample projects with diverse worktree configurations
# for comprehensive UI testing.
#
# Usage:
#   ./scripts/setup-test-repo.sh [name] [port]
#
# Created structure:
#   /tmp/grovr-test-{name}/
#   ├── sample-project/        (basic project with mixed worktrees)
#   ├── empty-project/         (clean project, no worktrees)
#   ├── full-project/          (all edge cases)
#   ├── config/                (tauri-plugin-store settings)
#   └── logs/

set -e

NAME="${1:-$(date +%s)}"
PORT="${2:-1420}"
# Use realpath to get canonical path (macOS /tmp -> /private/tmp)
BASE_DIR="$(cd /tmp && pwd -P)/grovr-test-${NAME}"

# Remove if already exists
if [ -d "$BASE_DIR" ]; then
    rm -rf "$BASE_DIR"
fi

echo "=== Grovr Desktop Test Repository Setup ==="
echo "Name: $NAME"
echo "Location: $BASE_DIR"
echo ""

# Create directory structure
mkdir -p "$BASE_DIR"/{config,logs}

#######################################
# Project 1: sample-project (basic)
# - Mixed worktrees with various states
#######################################
echo "[1/3] Creating sample-project..."

SAMPLE_DIR="$BASE_DIR/sample-project"
mkdir -p "$SAMPLE_DIR"/{repo,worktrees}

cd "$SAMPLE_DIR/repo"
git init
git config user.email "test@grovr.local"
git config user.name "Grovr Test"

cat > README.md << 'EOF'
# Sample Project

Basic sample project for Grovr Desktop testing.
EOF

mkdir -p src
cat > src/index.js << 'EOF'
export function hello() {
  return "Hello from Grovr!";
}
EOF

cat > package.json << 'EOF'
{
  "name": "sample-project",
  "version": "1.0.0"
}
EOF

git add -A
git commit -m "Initial commit"

# Create branches and worktrees
git branch feature-auth
git branch feature-settings
git branch bugfix-memory-leak

git worktree add "$SAMPLE_DIR/worktrees/feature-auth" feature-auth
git worktree add "$SAMPLE_DIR/worktrees/feature-settings" feature-settings
git worktree add "$SAMPLE_DIR/worktrees/bugfix-memory-leak" bugfix-memory-leak

# Add commits to some worktrees
cd "$SAMPLE_DIR/worktrees/feature-auth"
echo "export function login() {}" > src/auth.js
git add src/auth.js
git commit -m "WIP: Add auth module"

#######################################
# Project 2: empty-project
# - No worktrees, just main branch
#######################################
echo "[2/3] Creating empty-project..."

EMPTY_DIR="$BASE_DIR/empty-project"
mkdir -p "$EMPTY_DIR/repo"

cd "$EMPTY_DIR/repo"
git init
git config user.email "test@grovr.local"
git config user.name "Grovr Test"

cat > README.md << 'EOF'
# Empty Project

A clean project with no worktrees.
EOF

git add -A
git commit -m "Initial commit"

#######################################
# Project 3: full-project (edge cases)
# - All worktree variations for testing
#######################################
echo "[3/3] Creating full-project..."

FULL_DIR="$BASE_DIR/full-project"
mkdir -p "$FULL_DIR"/{repo,worktrees}

cd "$FULL_DIR/repo"
git init
git config user.email "test@grovr.local"
git config user.name "Grovr Test"

cat > README.md << 'EOF'
# Full Project

Comprehensive project with all worktree edge cases.
EOF

mkdir -p src tests docs
echo "export const VERSION = '2.0.0';" > src/version.js
echo "test('works', () => {});" > tests/main.test.js

git add -A
git commit -m "Initial commit: project setup"

# Create various branches
git branch feature-login
git branch feature-dashboard
git branch PROJ-301-api-refactor
git branch PROJ-302-null-pointer
git branch hotfix-security-patch
git branch release-v1.0

# Create worktrees with different states
git worktree add "$FULL_DIR/worktrees/feature-login" feature-login
git worktree add "$FULL_DIR/worktrees/feature-dashboard" feature-dashboard
git worktree add "$FULL_DIR/worktrees/PROJ-301" PROJ-301-api-refactor
git worktree add "$FULL_DIR/worktrees/PROJ-302" PROJ-302-null-pointer
git worktree add "$FULL_DIR/worktrees/hotfix-security-patch" hotfix-security-patch
git worktree add "$FULL_DIR/worktrees/release-v1.0" release-v1.0

# feature-login: has description, no Jira, with commits
cd "$FULL_DIR/worktrees/feature-login"
cat > src/auth.js << 'EOF'
export function login(user, pass) {
  // OAuth implementation
  return fetch('/api/auth', { method: 'POST', body: JSON.stringify({ user, pass }) });
}
EOF
git add src/auth.js
git commit -m "Add OAuth login implementation"

# feature-dashboard: no description, no Jira, no commits (empty worktree)
# (nothing to do - it's already empty)

# PROJ-301: has Jira, has description, with commits
cd "$FULL_DIR/worktrees/PROJ-301"
cat > src/api.js << 'EOF'
export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  async get(path) {
    return fetch(`${this.baseUrl}${path}`);
  }
}
EOF
git add src/api.js
git commit -m "PROJ-301: Refactor API client to class-based"

# PROJ-302: has Jira, no description, with commits
cd "$FULL_DIR/worktrees/PROJ-302"
echo "// Fixed null pointer" > src/bugfix.js
git add src/bugfix.js
git commit -m "PROJ-302: Fix null pointer exception"

# hotfix-security-patch: no Jira, no description, dirty state (uncommitted changes)
cd "$FULL_DIR/worktrees/hotfix-security-patch"
echo "// Security patch in progress" > src/security.js
# Don't commit - leave as dirty

# release-v1.0: no Jira, has description, clean state
cd "$FULL_DIR/worktrees/release-v1.0"
echo "v1.0.0" > VERSION
git add VERSION
git commit -m "Prepare release v1.0.0"

#######################################
# Create Tauri Store settings file
#######################################
cat > "$BASE_DIR/config/settings.json" << EOF
{
  "settings": {
    "ide": {
      "type": "preset",
      "preset": "code"
    },
    "theme": "system",
    "launch_at_startup": false,
    "default_worktree_template": "{project}.worktrees/{branch}",
    "copy_paths": [],
    "fetch_before_create": true,
    "refresh_interval_minutes": 5,
    "skip_open_ide_confirm": false,
    "onboarding_completed": true,
    "projects": [
      {
        "name": "sample-project",
        "repo_path": "$SAMPLE_DIR/repo"
      },
      {
        "name": "empty-project",
        "repo_path": "$EMPTY_DIR/repo"
      },
      {
        "name": "full-project",
        "repo_path": "$FULL_DIR/repo"
      }
    ],
    "github_configs": [],
    "jira_configs": [
      {
        "host": "grovr-test.atlassian.net",
        "email": "test@grovr.local"
      }
    ],
    "worktree_memos": {
      "$FULL_DIR/worktrees/feature-login": {
        "description": "OAuth 2.0 login flow implementation"
      },
      "$FULL_DIR/worktrees/PROJ-301": {
        "description": "Refactor API layer to class-based architecture",
        "issue_number": "PROJ-301"
      },
      "$FULL_DIR/worktrees/PROJ-302": {
        "issue_number": "PROJ-302"
      },
      "$FULL_DIR/worktrees/release-v1.0": {
        "description": "Release preparation for v1.0"
      }
    }
  }
}
EOF

#######################################
# Output results
#######################################
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Projects created:"
echo "  1. sample-project - Basic project with 3 worktrees (no memos)"
echo "  2. empty-project  - Clean project, no worktrees"
echo "  3. full-project   - Edge cases with 6 worktrees"
echo ""
echo "Worktree variations in full-project:"
echo "  - feature-login:        description only, with commits"
echo "  - feature-dashboard:    nothing, empty worktree"
echo "  - PROJ-301:             Jira + description, with commits"
echo "  - PROJ-302:             Jira only, with commits"
echo "  - hotfix-security-patch: nothing, dirty state (uncommitted)"
echo "  - release-v1.0:         description only, clean"
echo ""

cat << EOF
{
  "name": "$NAME",
  "testRoot": "$BASE_DIR",
  "port": $PORT,
  "configDir": "$BASE_DIR/config",
  "projects": [
    "$SAMPLE_DIR/repo",
    "$EMPTY_DIR/repo",
    "$FULL_DIR/repo"
  ]
}
EOF
