#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT"

echo -e "${BLUE}=== Grovr Build ===${NC}"
echo ""

# Step 1: Verify bump was run
echo "Checking prerequisites..."
LAST_COMMIT=$(git log -1 --pretty=%s)

if [[ ! "$LAST_COMMIT" =~ ^"chore: bump version to" ]]; then
  echo -e "${RED}ERROR: Last commit is not a version bump${NC}"
  echo "Last commit: $LAST_COMMIT"
  echo ""
  echo "Run /bump <version> first"
  exit 1
fi

VERSION=$(echo "$LAST_COMMIT" | sed 's/chore: bump version to //')
echo -e "${GREEN}✓${NC} Version bump found: $VERSION"

# Step 2: Verify environment variables
echo ""
echo "Checking environment variables..."
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

# Step 3: Build
echo ""
echo -e "${BLUE}Building Tauri application...${NC}"
echo "This may take a few minutes..."
echo ""

pnpm install
pnpm tauri build

# Step 4: Verify code signature
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

# Step 5: Generate latest.json
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

# Step 6: Summary
echo ""
echo -e "${GREEN}=== Build Complete ===${NC}"
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
