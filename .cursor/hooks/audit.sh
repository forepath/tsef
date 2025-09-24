#!/bin/bash
# audit.sh - Cursor Hooks Audit Script
# This script logs all Cursor hook events for audit and debugging purposes
# Part of the DevKit enterprise-ready development framework

# Configuration
AUDIT_LOG_DIR="/tmp/devkit-audit"
AUDIT_LOG_FILE="$AUDIT_LOG_DIR/cursor-audit.log"
MAX_LOG_SIZE_MB=100
MAX_LOG_FILES=10

# Create audit log directory if it doesn't exist
mkdir -p "$AUDIT_LOG_DIR"

# Function to rotate logs if they get too large
rotate_logs() {
    if [[ -f "$AUDIT_LOG_FILE" ]]; then
        local file_size_mb=$(du -m "$AUDIT_LOG_FILE" | cut -f1)
        if [[ $file_size_mb -gt $MAX_LOG_SIZE_MB ]]; then
            # Rotate existing logs
            for i in $(seq $((MAX_LOG_FILES-1)) -1 1); do
                if [[ -f "$AUDIT_LOG_FILE.$i" ]]; then
                    mv "$AUDIT_LOG_FILE.$i" "$AUDIT_LOG_FILE.$((i+1))"
                fi
            done
            mv "$AUDIT_LOG_FILE" "$AUDIT_LOG_FILE.1"
            echo "Log rotated due to size limit" > "$AUDIT_LOG_FILE"
        fi
    fi
}

# Function to get hook context
get_hook_context() {
    local hook_type="$1"
    local context=""

    case "$hook_type" in
        "beforeShellExecution")
            context="SHELL_CMD"
            ;;
        "beforeMCPExecution")
            context="MCP_TOOL"
            ;;
        "afterFileEdit")
            context="FILE_EDIT"
            ;;
        "beforeSubmitPrompt")
            context="PROMPT_SUBMIT"
            ;;
        "stop")
            context="SESSION_STOP"
            ;;
        *)
            context="UNKNOWN"
            ;;
    esac

    echo "$context"
}

# Function to sanitize sensitive data
sanitize_input() {
    local input="$1"
    # Remove potential sensitive patterns
    echo "$input" | sed -E 's/(password|token|key|secret)=[^[:space:]]+/***REDACTED***/gi'
}

# Main audit function
audit_event() {
    local hook_type="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local context=$(get_hook_context "$hook_type")
    local sanitized_input=""

    # Read and sanitize input if available
    if [[ -t 0 ]]; then
        # No input available
        sanitized_input="<no_input>"
    else
        # Read and sanitize input
        sanitized_input=$(cat | sanitize_input)
    fi

    # Create audit entry
    local audit_entry="[$timestamp] [$context] $sanitized_input"

    # Rotate logs if necessary
    rotate_logs

    # Write to audit log
    echo "$audit_entry" >> "$AUDIT_LOG_FILE"

    # Also write to system log for enterprise environments
    if command -v logger >/dev/null 2>&1; then
        logger -t "devkit-cursor-audit" "$audit_entry"
    fi
}

# Determine hook type from environment or arguments
HOOK_TYPE="${CURSOR_HOOK_TYPE:-${1:-unknown}}"

# If no hook type provided, try to infer from context
if [[ "$HOOK_TYPE" == "unknown" ]]; then
    # Try to get hook type from environment variables set by Cursor
    if [[ -n "$CURSOR_HOOK_EVENT" ]]; then
        HOOK_TYPE="$CURSOR_HOOK_EVENT"
    elif [[ -n "$HOOK_EVENT" ]]; then
        HOOK_TYPE="$HOOK_EVENT"
    fi
fi

# Perform audit
audit_event "$HOOK_TYPE"

# Exit successfully
exit 0
