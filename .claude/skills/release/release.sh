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

# Parse arguments
MODE=""
NOTES=""
NOTES_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --check)
      MODE="check"
      shift
      ;;
    --publish)
      MODE="publish"
      NOTES="$2"
      shift 2
      ;;
    --publish-file)
      MODE="publish"
      NOTES_FILE="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage:"
      echo "  $0 --check                    # Verify prerequisites"
      echo "  $0 --publish \"Release notes\"  # Publish with inline notes"
      echo "  $0 --publish-file notes.md    # Publish with notes from file"
      exit 1
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "Usage:"
  echo "  $0 --check                    # Verify prerequisites"
  echo "  $0 --publish \"Release notes\"  # Publish with inline notes"
  echo "  $0 --publish-file notes.md    # Publish with notes from file"
  exit 1
fi

# Load notes from file if specified
if [[ -n "$NOTES_FILE" ]]; then
  if [[ ! -f "$NOTES_FILE" ]]; then
    echo -e "${RED}ERROR: Notes file not found: $NOTES_FILE${NC}"
    exit 1
  fi
  NOTES=$(cat "$NOTES_FILE")
fi

echo -e "${BLUE}=== Grovr Release ===${NC}"
echo ""

# Check 1: Last commit should be version bump
echo "Checking prerequisites..."
LAST_COMMIT=$(git log -1 --pretty=%s)

if [[ ! "$LAST_COMMIT" =~ ^"chore: bump version to" ]]; then
  echo -e "${RED}✗ Last commit is not a version bump${NC}"
  echo "  Last commit: $LAST_COMMIT"
  echo ""
  echo "Run /bump <version> first"
  exit 1
fi

VERSION=$(echo "$LAST_COMMIT" | sed 's/chore: bump version to //')
echo -e "${GREEN}✓${NC} Version bump found: $VERSION"

# Check 2: Build artifacts should exist
if [[ ! -f "src-tauri/target/release/bundle/latest.json" ]]; then
  echo -e "${RED}✗ Build artifacts not found${NC}"
  echo ""
  echo "Run /build first"
  exit 2
fi
echo -e "${GREEN}✓${NC} Build artifacts found"

# Check 3: Version in artifacts matches committed version
COMMITTED_VERSION=$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
BUILT_VERSION=$(grep '"version"' src-tauri/target/release/bundle/latest.json | sed 's/.*: "\(.*\)".*/\1/')

if [[ "$COMMITTED_VERSION" != "$BUILT_VERSION" ]]; then
  echo -e "${RED}✗ Version mismatch${NC}"
  echo "  Committed: $COMMITTED_VERSION"
  echo "  Built: $BUILT_VERSION"
  echo ""
  echo "Run /build again"
  exit 3
fi
echo -e "${GREEN}✓${NC} Versions match: $VERSION"

# Check 4: Tag doesn't already exist
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠${NC} Tag v$VERSION already exists"
  if [[ "$MODE" == "publish" ]]; then
    echo "Delete it first with: git tag -d v$VERSION && git push --delete origin v$VERSION"
    exit 4
  fi
fi

# Find artifacts
DMG_FILE=$(ls src-tauri/target/release/bundle/dmg/Grovr_*.dmg 2>/dev/null | head -1)
TAR_FILE="src-tauri/target/release/bundle/macos/Grovr.app.tar.gz"
LATEST_FILE="src-tauri/target/release/bundle/latest.json"

echo ""
echo "Artifacts to upload:"
echo "  - $(basename "$DMG_FILE")"
echo "  - Grovr.app.tar.gz"
echo "  - latest.json"

# If check mode, stop here
if [[ "$MODE" == "check" ]]; then
  echo ""
  echo -e "${GREEN}✓ Ready to release v$VERSION${NC}"
  echo ""
  echo "Run /release to publish"
  exit 0
fi

# Publish mode requires notes
if [[ -z "$NOTES" ]]; then
  echo -e "${RED}ERROR: Release notes required for publishing${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}Publishing release v$VERSION...${NC}"

# Create and push tag
echo ""
echo "Creating tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"

echo "Pushing to origin..."
git push origin main
git push origin "v$VERSION"

# Create GitHub release
echo ""
echo "Creating GitHub release..."
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --notes "$NOTES" \
  "$DMG_FILE" \
  "$TAR_FILE" \
  "$LATEST_FILE"

# Verify
echo ""
echo -e "${GREEN}=== Release Complete ===${NC}"
echo ""
gh release view "v$VERSION" --json url,assets -q '"URL: \(.url)\n\nAssets:", (.assets[].name)'
