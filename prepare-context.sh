#!/bin/bash

# prepare-context.sh
# Calls both prepare-claude.sh and prepare-github-copilot.sh
# to generate consolidated context files for Claude and GitHub Copilot

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "🚀 Preparing context files for all AI tools"
echo ""

# Run prepare-claude.sh
echo "📋 Step 1/2: Preparing Claude tools..."
"$PROJECT_ROOT/prepare-claude.sh"

echo ""
echo "─────────────────────────────────────────────────────────────"
echo ""

# Run prepare-github-copilot.sh
echo "📋 Step 2/2: Preparing GitHub Copilot instructions..."
"$PROJECT_ROOT/prepare-github-copilot.sh"

echo ""
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "✅ All context files prepared successfully!"
echo ""
