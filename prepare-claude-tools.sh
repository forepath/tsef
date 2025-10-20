#!/bin/bash

# prepare-claude-tools.sh
# Consolidates .cursor/rules into CLAUDE.md and copies .cursor/commands to .claude/commands
# for use with Claude code

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "🚀 Preparing Claude tools for project: $(basename "$PROJECT_ROOT")"

# Create .claude directory if it doesn't exist
CLAUDE_DIR="$PROJECT_ROOT/.claude"
mkdir -p "$CLAUDE_DIR"

# Create CLAUDE.md by consolidating all rules
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
echo "📝 Consolidating rules into $CLAUDE_MD"

# Start the consolidated file (empty initially)
rm -f "$CLAUDE_MD"
touch "$CLAUDE_MD"

# Process each rule file
RULES_DIR="$PROJECT_ROOT/.cursor/rules"
if [ -d "$RULES_DIR" ]; then
    echo "📋 Processing rule files from $RULES_DIR"

    # Sort files for consistent ordering
    for rule_file in $(find "$RULES_DIR" -name "*.mdc" | sort); do
        filename=$(basename "$rule_file")
        echo "  📄 Processing $filename"

        # Skip frontmatter and add content
        awk '/^---$/{if(++count==2) next} count<2{next} {print}' "$rule_file" >> "$CLAUDE_MD"

        # Only add "---" if this is not the last rule file
        if [[ "$rule_file" != "$(find "$RULES_DIR" -name "*.mdc" | sort | tail -n 1)" ]]; then
          echo "" >> "$CLAUDE_MD"
          echo "---" >> "$CLAUDE_MD"
        fi
    done
else
    echo "⚠️  Warning: Rules directory $RULES_DIR not found"
fi

# Copy commands directory
COMMANDS_SRC="$PROJECT_ROOT/.cursor/commands"
COMMANDS_DST="$CLAUDE_DIR/commands"

if [ -d "$COMMANDS_SRC" ]; then
    echo "📁 Copying commands from $COMMANDS_SRC to $COMMANDS_DST"

    # Remove existing commands directory if it exists
    if [ -d "$COMMANDS_DST" ]; then
        rm -rf "$COMMANDS_DST"
    fi

    # Copy the entire commands directory
    cp -r "$COMMANDS_SRC" "$COMMANDS_DST"

    # List copied files
    echo "  📋 Copied command files:"
    find "$COMMANDS_DST" -type f | while read -r file; do
        echo "    📄 $(basename "$file")"
    done
else
    echo "⚠️  Warning: Commands directory $COMMANDS_SRC not found"
fi

# Copy MCP configuration file
MCP_SRC="$PROJECT_ROOT/.cursor/mcp.json"
MCP_DST="$CLAUDE_DIR/.mcp.json"

if [ -f "$MCP_SRC" ]; then
    echo "📄 Copying MCP configuration from $MCP_SRC to $MCP_DST"
    cp "$MCP_SRC" "$MCP_DST"
    echo "  ✅ MCP configuration copied"
else
    echo "⚠️  Warning: MCP configuration file $MCP_SRC not found"
fi

# Remove the first line from CLAUDE_MD if it is empty
if [ -f "$CLAUDE_MD" ]; then
    first_line=$(head -n 1 "$CLAUDE_MD")
    if [ -z "$first_line" ]; then
        # Remove the first line (empty)
        tail -n +2 "$CLAUDE_MD" > "$CLAUDE_MD.tmp" && mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"
    fi
fi

# Final summary
echo ""
echo "✅ Claude tools preparation complete!"
echo ""
echo "📁 Created/Updated:"
echo "  📄 $CLAUDE_MD"
if [ -d "$COMMANDS_DST" ]; then
    echo "  📁 $COMMANDS_DST/"
fi
if [ -f "$MCP_DST" ]; then
    echo "  📄 $MCP_DST"
fi
echo ""
echo "🎯 You can now use these files with Claude code:"
echo "  - Import guidelines from: $CLAUDE_MD"
echo "  - Reference commands from: $COMMANDS_DST/"
if [ -f "$MCP_DST" ]; then
    echo "  - Use MCP configuration from: $MCP_DST"
fi
echo ""
