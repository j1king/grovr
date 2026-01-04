#!/bin/bash
#
# Grovr Desktop Test Repository Setup Script
#
# Usage:
#   ./scripts/setup-test-repo.sh [name] [port]
#
# Created structure:
#   /tmp/grovr-desktop-test-{name}/
#   ├── repo/              (git repository - main worktree)
#   ├── worktrees/         (worktrees)
#   ├── config/            (tauri-plugin-store settings)
#   └── logs/              (log files)

set -e

NAME="${1:-$(date +%s)}"
PORT="${2:-1420}"
BASE_DIR="/tmp/grovr-desktop-test-${NAME}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Remove if already exists
if [ -d "$BASE_DIR" ]; then
    rm -rf "$BASE_DIR"
fi

echo "=== Grovr Desktop Test Repository Setup ==="
echo "Name: $NAME"
echo "Location: $BASE_DIR"
echo ""

# Create directory structure
mkdir -p "$BASE_DIR"/{repo,worktrees,config,logs}

#######################################
# 1. Initialize main repository
#######################################
cd "$BASE_DIR/repo"
git init
git config user.email "test@grovr.local"
git config user.name "Grovr Test"

# Create initial files
cat > README.md << 'EOF'
# Sample Project

Sample project for Grovr Desktop testing.
EOF

mkdir -p src docs tests

cat > src/index.js << 'EOF'
export function hello() {
  return "Hello from Grovr!";
}
EOF

cat > package.json << 'EOF'
{
  "name": "grovr-sample-project",
  "version": "1.0.0"
}
EOF

# Initial commit
git add -A
git commit -m "Initial commit: project setup"

# Additional commit
echo "export const VERSION = '1.0.0';" > src/version.js
git add src/version.js
git commit -m "Add version constant"

#######################################
# 2. Feature branch worktrees
#######################################
git branch feature-auth
git branch feature-ui
git branch bugfix-123

git worktree add "$BASE_DIR/worktrees/feature-auth" feature-auth
git worktree add "$BASE_DIR/worktrees/feature-ui" feature-ui
git worktree add "$BASE_DIR/worktrees/bugfix-123" bugfix-123

# feature-auth work
cd "$BASE_DIR/worktrees/feature-auth"
cat > src/auth.js << 'EOF'
export function login(username, password) {
  // TODO: implement
}
EOF
git add src/auth.js
git commit -m "WIP: Add auth module skeleton"

# feature-ui work
cd "$BASE_DIR/worktrees/feature-ui"
cat > src/components.js << 'EOF'
export function Button({ label }) {
  return `<button>${label}</button>`;
}
EOF
git add src/components.js
git commit -m "Add Button component"

#######################################
# 3. Ticket-based worktrees
#######################################
cd "$BASE_DIR/repo"
git branch PROJ-101-user-profile
git branch PROJ-202-dashboard-widget

git worktree add "$BASE_DIR/worktrees/PROJ-101" PROJ-101-user-profile
git worktree add "$BASE_DIR/worktrees/PROJ-202" PROJ-202-dashboard-widget

# PROJ-101 work
cd "$BASE_DIR/worktrees/PROJ-101"
cat > src/profile.js << 'EOF'
export function UserProfile({ user }) {
  return `<div class="profile">${user.name}</div>`;
}
EOF
git add src/profile.js
git commit -m "PROJ-101: Add user profile component"

#######################################
# 4. Create Tauri Store settings file
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
        "repo_path": "$BASE_DIR/repo"
      }
    ],
    "github_configs": [],
    "jira_configs": [],
    "worktree_memos": {
      "$BASE_DIR/worktrees/feature-auth": {
        "description": "Login/authentication implementation"
      },
      "$BASE_DIR/worktrees/PROJ-101": {
        "description": "User profile page",
        "issue_number": "PROJ-101"
      },
      "$BASE_DIR/worktrees/PROJ-202": {
        "description": "Dashboard widget",
        "issue_number": "PROJ-202"
      }
    }
  }
}
EOF

#######################################
# 5. Output results
#######################################
echo ""
echo "=== Setup Complete ==="
cd "$BASE_DIR/repo"
git worktree list
echo ""

cat << EOF
{
  "name": "$NAME",
  "testRoot": "$BASE_DIR",
  "port": $PORT,
  "configDir": "$BASE_DIR/config",
  "repoPath": "$BASE_DIR/repo"
}
EOF
