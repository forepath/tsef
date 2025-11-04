#!/bin/bash

# prepare-github-copilot.sh
# Consolidates .cursor/rules into copilot-instructions.md
# for use with GitHub Copilot

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "🚀 Preparing GitHub Copilot instructions for project: $(basename "$PROJECT_ROOT")"

# Create .github directory if it doesn't exist
GITHUB_DIR="$PROJECT_ROOT/.github"
mkdir -p "$GITHUB_DIR"

# Create copilot-instructions.md by consolidating all rules
COPILOT_INSTRUCTIONS="$GITHUB_DIR/copilot-instructions.md"
echo "📝 Consolidating rules into $COPILOT_INSTRUCTIONS"

# Start the consolidated file (empty initially)
rm -f "$COPILOT_INSTRUCTIONS"
touch "$COPILOT_INSTRUCTIONS"

# Process each rule file
RULES_DIR="$PROJECT_ROOT/.cursor/rules"
if [ -d "$RULES_DIR" ]; then
    echo "📋 Processing rule files from $RULES_DIR"

    # Sort files for consistent ordering
    for rule_file in $(find "$RULES_DIR" -name "*.mdc" | sort); do
        filename=$(basename "$rule_file")
        echo "  📄 Processing $filename"

        # Skip frontmatter and add content
        awk '/^---$/{if(++count==2) next} count<2{next} {print}' "$rule_file" >> "$COPILOT_INSTRUCTIONS"

        # Only add "---" if this is not the last rule file
        if [[ "$rule_file" != "$(find "$RULES_DIR" -name "*.mdc" | sort | tail -n 1)" ]]; then
          echo "" >> "$COPILOT_INSTRUCTIONS"
          echo "---" >> "$COPILOT_INSTRUCTIONS"
        fi
    done
else
    echo "⚠️  Warning: Rules directory $RULES_DIR not found"
fi

# Remove the first line from COPILOT_INSTRUCTIONS if it is empty
if [ -f "$COPILOT_INSTRUCTIONS" ]; then
    first_line=$(head -n 1 "$COPILOT_INSTRUCTIONS")
    if [ -z "$first_line" ]; then
        # Remove the first line (empty)
        tail -n +2 "$COPILOT_INSTRUCTIONS" > "$COPILOT_INSTRUCTIONS.tmp" && mv "$COPILOT_INSTRUCTIONS.tmp" "$COPILOT_INSTRUCTIONS"
    fi
fi

# Final summary
echo ""
echo "✅ GitHub Copilot instructions preparation complete!"
echo ""
echo "📁 Created/Updated:"
echo "  📄 $COPILOT_INSTRUCTIONS"
echo ""
echo "🎯 GitHub Copilot will now use these instructions when generating suggestions."
echo "   Run this script whenever rules are updated."
echo ""
