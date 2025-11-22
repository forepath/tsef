#!/bin/bash

set -euo pipefail

SCRIPT_NAME="hooks.sh"
FORCE=0

# Colors
if [ -t 1 ]; then
    RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"; BLUE="\033[0;34m"; NC="\033[0m"
else
    RED=""; GREEN=""; YELLOW=""; BLUE=""; NC=""
fi

timestamp() { date +"%Y-%m-%dT%H:%M:%S%z"; }
log_info() { echo -e "$(timestamp) ${BLUE}[INFO]${NC} $*"; }
log_warn() { echo -e "$(timestamp) ${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "$(timestamp) ${RED}[ERROR]${NC} $*" 1>&2; }
log_success() { echo -e "$(timestamp) ${GREEN}[SUCCESS]${NC} $*"; }
die() { log_error "$*"; exit 1; }

usage() {
    cat <<EOF
${SCRIPT_NAME} - Setup Cursor hooks symlinks

This script symlinks .cursor/hooks and .cursor/hooks.json from the current
directory to ~/.cursor/ to enable project-specific Cursor hooks.

Options:
  --force          Overwrite existing symlinks or files
  -h, --help       Show this help message
EOF
}

while [ "${1-}" != "" ]; do
    case "$1" in
        --force)
            FORCE=1; shift ;;
        -h|--help)
            usage; exit 0 ;;
        *)
            usage; die "Unknown option: $1" ;;
    esac
done

# Detect project root: prefer script location, fallback to current working directory
# This handles both direct execution (./hooks.sh) and curl | bash execution
# When run via curl | bash, BASH_SOURCE[0] may be a pipe, so we use current directory
if [ -f "${BASH_SOURCE[0]}" ] 2>/dev/null; then
    # Try to use script's directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || SCRIPT_DIR=""
fi

# Fallback to current working directory (required for curl | bash execution)
# User should run this command from the project root directory
if [ -z "${SCRIPT_DIR}" ]; then
    SCRIPT_DIR="$(pwd)"
fi

CURSOR_DIR="${SCRIPT_DIR}/.cursor"
HOME_CURSOR_DIR="${HOME}/.cursor"

log_info "Setting up Cursor hooks from ${SCRIPT_DIR}..."

# Create ~/.cursor directory if it doesn't exist
if [ ! -d "${HOME_CURSOR_DIR}" ]; then
    log_info "Creating ${HOME_CURSOR_DIR}..."
    mkdir -p "${HOME_CURSOR_DIR}"
fi

# Function to create symlink
create_symlink() {
    local source="$1"
    local target="$2"
    local name="$3"

    if [ ! -e "${source}" ]; then
        log_warn "${name} not found at ${source}, skipping..."
        return 0
    fi

    # Check if target already exists
    if [ -e "${target}" ] || [ -L "${target}" ]; then
        if [ "${FORCE}" -eq 1 ]; then
            log_warn "Removing existing ${target}..."
            rm -f "${target}"
        else
            log_warn "${target} already exists. Use --force to overwrite."
            return 0
        fi
    fi

    # Create symlink
    log_info "Creating symlink: ${target} -> ${source}"
    ln -s "${source}" "${target}"
    log_success "Symlinked ${name} to ${target}"
}

# Symlink hooks directory if it exists
if [ -d "${CURSOR_DIR}/hooks" ]; then
    create_symlink "${CURSOR_DIR}/hooks" "${HOME_CURSOR_DIR}/hooks" "hooks directory"
else
    log_info "No hooks directory found at ${CURSOR_DIR}/hooks"
fi

# Symlink hooks.json if it exists
if [ -f "${CURSOR_DIR}/hooks.json" ]; then
    create_symlink "${CURSOR_DIR}/hooks.json" "${HOME_CURSOR_DIR}/hooks.json" "hooks.json"
else
    log_info "No hooks.json found at ${CURSOR_DIR}/hooks.json"
fi

log_success "Cursor hooks setup complete!"
