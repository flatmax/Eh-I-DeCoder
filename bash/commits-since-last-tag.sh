#!/bin/bash

# Get all git commits as one-liners since a specified tag
# Usage: ./commits-since-last-tag.sh [tag]
# If no tag is provided, uses the most recent tag

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check if a tag was provided as an argument
if [ $# -eq 1 ]; then
    LAST_TAG=$1
    # Verify the tag exists
    if ! git rev-parse --verify "refs/tags/$LAST_TAG" >/dev/null 2>&1; then
        echo "Error: Tag '$LAST_TAG' does not exist"
        exit 1
    fi
else
    # Get the most recent tag
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
fi

if [ -z "$LAST_TAG" ]; then
    echo "No tags found in repository. Showing all commits:"
    git log --oneline
else
    echo "Commits since tag ($LAST_TAG):"
    git log --oneline "${LAST_TAG}..HEAD"
fi
