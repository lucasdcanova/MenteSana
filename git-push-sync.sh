#!/bin/bash

# Script para fazer commit, build, sync e push de uma vez

# Check if commit message was provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a commit message"
    echo "Usage: ./git-push-sync.sh \"your commit message\""
    exit 1
fi

echo "📝 Adding all changes..."
git add .

echo "💾 Committing with message: $1"
git commit -m "$1"

# The post-commit hook will automatically run capacitor-sync.sh

echo "📤 Pushing to remote..."
git push

echo "✅ All done! Changes committed, built, synced and pushed!"