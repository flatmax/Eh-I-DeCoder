#!/bin/bash

# Get all git commits as one-liners since the last tag

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Get the most recent tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)

if [ -z "$LAST_TAG" ]; then
    echo "No tags found in repository. Showing all commits:"
    git log --oneline
else
    echo "Commits since last tag ($LAST_TAG):"
    git log --oneline "${LAST_TAG}..HEAD"
fi
