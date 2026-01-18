#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
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

echo -e "${BLUE}=== Grovr Bump & Build ===${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
echo "Current version: $CURRENT_VERSION"
echo "New version: $VERSION"
echo ""

# === Step 1: Update version in all files ===
echo -e "${BLUE}Step 1: Updating version...${NC}"

echo "  Updating package.json..."
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$VERSION\"/" package.json

echo "  Updating src-tauri/tauri.conf.json..."
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json

echo "  Updating src-tauri/Cargo.toml..."
sed -i '' "s/^version = \"$CURRENT_VERSION\"/version = \"$VERSION\"/" src-tauri/Cargo.toml

echo "  Updating grovr.cask.rb version..."
sed -i '' "s/version \".*\"/version \"$VERSION\"/" grovr.cask.rb

echo -e "${GREEN}✓${NC} Version updated to $VERSION"

# === Step 2: Check build environment ===
echo ""
echo -e "${BLUE}Step 2: Checking build environment...${NC}"

MISSING=""
if [[ -z "$APPLE_SIGNING_IDENTITY" ]]; then
  MISSING="$MISSING  - APPLE_SIGNING_IDENTITY\n"
fi
if [[ -z "$TAURI_SIGNING_PRIVATE_KEY" ]]; then
  MISSING="$MISSING  - TAURI_SIGNING_PRIVATE_KEY\n"
fi

if [[ -n "$MISSING" ]]; then
  echo -e "${RED}ERROR: Missing required environment variables:${NC}"
  echo -e "$MISSING"
  echo "See documentation for setup instructions"
  exit 2
fi

echo -e "${GREEN}✓${NC} APPLE_SIGNING_IDENTITY set"
echo -e "${GREEN}✓${NC} TAURI_SIGNING_PRIVATE_KEY set"

# Check optional notarization credentials
if [[ -z "$APPLE_ID" || -z "$APPLE_PASSWORD" || -z "$APPLE_TEAM_ID" ]]; then
  echo -e "${YELLOW}⚠${NC} Notarization credentials not set (APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID)"
  echo "   App will be signed but NOT notarized"
  echo ""
  read -p "Continue without notarization? [Y/n] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Nn]$ ]]; then
    exit 2
  fi
else
  echo -e "${GREEN}✓${NC} Notarization credentials set"
fi

# === Step 3: Build ===
echo ""
echo -e "${BLUE}Step 3: Building Tauri application...${NC}"
echo ""

pnpm install
pnpm tauri build

# === Step 4: Verify code signature ===
echo ""
echo "Verifying code signature..."
SIGNATURE_INFO=$(codesign -dv --verbose=2 src-tauri/target/release/bundle/macos/Grovr.app 2>&1 || true)

if echo "$SIGNATURE_INFO" | grep -q "Authority=Developer ID"; then
  echo -e "${GREEN}✓${NC} Code signature verified"
  echo "$SIGNATURE_INFO" | grep -E "(Authority|TeamIdentifier)" | head -3
else
  echo -e "${RED}ERROR: Code signature verification failed${NC}"
  echo "$SIGNATURE_INFO"
  exit 4
fi

# === Step 5: Generate latest.json ===
echo ""
echo "Generating latest.json..."

SIGNATURE=$(cat src-tauri/target/release/bundle/macos/Grovr.app.tar.gz.sig)
PUB_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Detect architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
  PLATFORM="darwin-aarch64"
else
  PLATFORM="darwin-x86_64"
fi

cat > src-tauri/target/release/bundle/latest.json << EOF
{
  "version": "$VERSION",
  "notes": "See release notes on GitHub",
  "pub_date": "$PUB_DATE",
  "platforms": {
    "$PLATFORM": {
      "signature": "$SIGNATURE",
      "url": "https://github.com/j1king/grovr/releases/download/v$VERSION/Grovr.app.tar.gz"
    }
  }
}
EOF

echo -e "${GREEN}✓${NC} Created latest.json"

# === Step 6: Update cask sha256 ===
echo ""
echo "Updating cask sha256..."

DMG_FILE=$(ls src-tauri/target/release/bundle/dmg/Grovr_*.dmg 2>/dev/null | head -1)
SHA256=$(shasum -a 256 "$DMG_FILE" | cut -d' ' -f1)
sed -i '' "s/sha256 \".*\"/sha256 \"$SHA256\"/" grovr.cask.rb

echo -e "${GREEN}✓${NC} Cask sha256 updated"

# === Step 7: Commit all changes ===
echo ""
echo "Creating commit..."

git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml grovr.cask.rb
git commit -m "chore: bump version to $VERSION"

# === Summary ===
echo ""
echo -e "${GREEN}=== Bump & Build Complete ===${NC}"
echo ""
echo "Version: $VERSION"
echo "Platform: $PLATFORM"
echo ""
echo "Artifacts:"
ls -lh src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null || echo "  (no DMG found)"
ls -lh src-tauri/target/release/bundle/macos/*.tar.gz 2>/dev/null || echo "  (no tar.gz found)"
ls -lh src-tauri/target/release/bundle/latest.json 2>/dev/null || echo "  (no latest.json found)"
echo ""
echo "Next step: Run /release to publish to GitHub"
