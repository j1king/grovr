#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Get script directory (skills/bump/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Navigate to project root (3 levels up from .claude/skills/bump/)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT"

# Validate arguments
VERSION="$1"

if [[ -z "$VERSION" ]]; then
  echo -e "${RED}ERROR: Version argument required${NC}"
  echo "Usage: $0 <version>"
  echo "Example: $0 0.6.0"
  exit 1
fi

# Validate semantic version format
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}ERROR: Invalid version format${NC}"
  echo "Expected: X.Y.Z (e.g., 0.6.0)"
  echo "Got: $VERSION"
  exit 1
fi

# Check git status
if [[ -n "$(git status --porcelain)" ]]; then
  echo -e "${RED}ERROR: Uncommitted changes detected${NC}"
  echo ""
  git status --short
  echo ""
  echo "Please commit or stash your changes first"
  exit 2
fi

# Check current branch
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  echo -e "${YELLOW}WARNING: Not on main branch (current: $BRANCH)${NC}"
  read -p "Continue anyway? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Get current version
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
echo "Current version: $CURRENT_VERSION"
echo "New version: $VERSION"
echo ""

# Update package.json
echo "Updating package.json..."
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$VERSION\"/" package.json

# Update tauri.conf.json
echo "Updating src-tauri/tauri.conf.json..."
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json

# Update Cargo.toml
echo "Updating src-tauri/Cargo.toml..."
sed -i '' "s/^version = \"$CURRENT_VERSION\"/version = \"$VERSION\"/" src-tauri/Cargo.toml

# Verify updates
echo ""
echo "Verifying updates..."
NEW_PKG=$(grep '"version"' package.json | head -1)
NEW_TAURI=$(grep '"version"' src-tauri/tauri.conf.json | head -1)
NEW_CARGO=$(grep '^version' src-tauri/Cargo.toml | head -1)

echo "  package.json: $NEW_PKG"
echo "  tauri.conf.json: $NEW_TAURI"
echo "  Cargo.toml: $NEW_CARGO"

# Create commit
echo ""
echo "Creating commit..."
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to $VERSION"

echo ""
echo -e "${GREEN}✓ Version bumped to $VERSION${NC}"
echo ""
echo "Next steps:"
echo "  1. Run /build to create signed artifacts"
echo "  2. Run /release to publish to GitHub"
