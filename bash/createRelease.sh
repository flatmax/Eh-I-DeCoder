#!/bin/bash

# createRelease.sh - Script to create a new release
# Usage: ./createRelease.sh <version>
# Example: ./createRelease.sh 1.11.45

set -e  # Exit on any error

# Check if version argument is provided
if [ $# -eq 0 ]; then
    echo "Error: Version number is required"
    echo "Usage: $0 <version>"
    echo "Example: $0 1.11.45"
    exit 1
fi

VERSION=$1

# Validate version format (basic check for semantic versioning)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in format X.Y.Z (e.g., 1.11.45)"
    exit 1
fi

echo "Creating release for version: $VERSION"

# Get the script directory to find project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Update python/pyproject.toml
PYPROJECT_FILE="$PROJECT_ROOT/python/pyproject.toml"
if [ ! -f "$PYPROJECT_FILE" ]; then
    echo "Error: $PYPROJECT_FILE not found"
    exit 1
fi

echo "Updating $PYPROJECT_FILE..."
# Use sed to replace the version line
sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" "$PYPROJECT_FILE"
rm "$PYPROJECT_FILE.bak"

# Update webapp/package.json
PACKAGE_JSON_FILE="$PROJECT_ROOT/webapp/package.json"
if [ ! -f "$PACKAGE_JSON_FILE" ]; then
    echo "Error: $PACKAGE_JSON_FILE not found"
    exit 1
fi

echo "Updating $PACKAGE_JSON_FILE..."
# Use sed to replace the version line in package.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" "$PACKAGE_JSON_FILE"
rm "$PACKAGE_JSON_FILE.bak"

# Verify changes
echo "Verifying changes..."
echo "Python version: $(grep '^version = ' "$PYPROJECT_FILE")"
echo "Webapp version: $(grep '"version":' "$PACKAGE_JSON_FILE")"

# Stage the changes
echo "Staging changes..."
cd "$PROJECT_ROOT"
git add python/pyproject.toml webapp/package.json

# Commit the changes
echo "Committing version bump..."
git commit -m "Bump version to $VERSION"

# Create and push the tag
TAG_NAME="v$VERSION"
echo "Creating tag: $TAG_NAME"
git tag -a "$TAG_NAME" -m "Release version $VERSION"

echo "Release $VERSION created successfully!"
echo "Don't forget to push the changes and tag:"
echo "  git push origin main"
echo "  git push origin $TAG_NAME"
