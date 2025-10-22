#!/bin/bash

set -euo pipefail

SCRIPT_NAME="install.sh"
REPO_URL_SSH_DEFAULT="git@github.com:forepath/tsef.git"
REPO_URL_HTTPS_DEFAULT="https://github.com/forepath/tsef.git"
NVM_VERSION="v0.40.3"
NODE_VERSION=""
CLONE_DIR="devkit"
REF=""
RUN_UPDATE=1
ASSUME_YES=0

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
die() { log_error "$*"; exit 1; }

usage() {
    cat <<EOF
${SCRIPT_NAME} - Multi-distro installer and workspace scaffolder

Options:
  --repo <url>        Git repository URL to clone (default: SSH ${REPO_URL_SSH_DEFAULT})
  --dir <path>        Directory to clone into (default: ${CLONE_DIR})
  --ref <ref>         Git reference to checkout (tag, branch, or commit) (default: latest tag)
  --node <ver>        Node version for nvm (default: workspace .nvmrc or --lts)
  --no-update         Skip system package index update/upgrade
  -y, --yes           Assume "yes" for package manager prompts
  -h, --help          Show this help message
EOF
}

REPO_URL=""

while [ "${1-}" != "" ]; do
    case "$1" in
        --repo)
            REPO_URL="$2"; shift 2 ;;
        --dir)
            CLONE_DIR="$2"; shift 2 ;;
        --ref)
            REF="$2"; shift 2 ;;
        --node)
            NODE_VERSION="$2"; shift 2 ;;
        --no-update)
            RUN_UPDATE=0; shift ;;
        -y|--yes)
            ASSUME_YES=1; shift ;;
        -h|--help)
            usage; exit 0 ;;
        *)
            usage; die "Unknown option: $1" ;;
    esac
done

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || return 1
}

get_latest_tag() {
    local repo_url="$1"
    local temp_dir
    temp_dir="$(mktemp -d)"

    # Clone with minimal history to get tags
    git clone --filter=blob:none --no-checkout "${repo_url}" "${temp_dir}" 2>/dev/null || {
        rm -rf "${temp_dir}"
        return 1
    }

    # Get the latest tag
    local latest_tag
    latest_tag="$(git -C "${temp_dir}" tag --sort=-version:refname | head -n1)"

    # Clean up
    rm -rf "${temp_dir}"

    if [ -n "${latest_tag}" ]; then
        echo "${latest_tag}"
    else
        return 1
    fi
}

ensure_sudo() {
    if [ "${EUID}" -ne 0 ]; then
        if require_cmd sudo; then
            SUDO="sudo"
        else
            die "This script requires root privileges or 'sudo' installed."
        fi
    else
        SUDO=""
    fi
}

detect_distro() {
    if [ -r /etc/os-release ]; then
        . /etc/os-release
        echo "${ID}"
    else
        uname -s | tr '[:upper:]' '[:lower:]'
    fi
}

detect_pkg_manager() {
    if require_cmd apt-get; then echo apt; return; fi
    if require_cmd dnf; then echo dnf; return; fi
    if require_cmd yum; then echo yum; return; fi
    if require_cmd zypper; then echo zypper; return; fi
    if require_cmd pacman; then echo pacman; return; fi
    die "No supported package manager found (apt, dnf, yum, zypper, pacman)."
}

pkg_install() {
    local pkgs=("$@")
    local pm="$(detect_pkg_manager)"
    local yes_flag=""
    [ "$ASSUME_YES" -eq 1 ] && yes_flag="-y"

    case "$pm" in
        apt)
            [ "$RUN_UPDATE" -eq 1 ] && { $SUDO apt-get update -y || true; $SUDO DEBIAN_FRONTEND=noninteractive apt-get upgrade -y || true; }
            $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y "${pkgs[@]}" ;;
        dnf)
            [ "$RUN_UPDATE" -eq 1 ] && { $SUDO dnf -y update || true; }
            $SUDO dnf -y install "${pkgs[@]}" ;;
        yum)
            [ "$RUN_UPDATE" -eq 1 ] && { $SUDO yum -y update || true; }
            $SUDO yum -y install "${pkgs[@]}" ;;
        zypper)
            [ "$RUN_UPDATE" -eq 1 ] && { $SUDO zypper -n refresh || true; $SUDO zypper -n update || true; }
            $SUDO zypper -n install "${pkgs[@]}" ;;
        pacman)
            [ "$RUN_UPDATE" -eq 1 ] && { $SUDO pacman -Sy --noconfirm || true; }
            $SUDO pacman -S --needed --noconfirm "${pkgs[@]}" ;;
        *) die "Unsupported package manager: $pm" ;;
    esac
}

install_prereqs() {
    log_info "Detecting distribution and package manager..."
    local distro pm
    distro="$(detect_distro)"
    pm="$(detect_pkg_manager)"
    log_info "Distro: ${distro}, Package manager: ${pm}"

    case "$pm" in
        apt)
            pkg_install ca-certificates curl git bash build-essential openssh-client
            ;;
        dnf|yum)
            pkg_install ca-certificates curl git bash @"Development Tools" gcc-c++ make openssh-clients
            ;;
        zypper)
            pkg_install ca-certificates curl git bash -t pattern devel_basis || pkg_install ca-certificates curl git bash gcc gcc-c++ make openssh
            ;;
        pacman)
            pkg_install ca-certificates curl git bash base-devel openssh
            ;;
    esac
}

install_nvm_and_node() {
    if [ ! -d "$HOME/.nvm" ]; then
        log_info "Installing nvm ${NVM_VERSION}..."
        curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
    else
        log_info "nvm already installed."
    fi

    # shellcheck disable=SC1090
    [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
    # shellcheck disable=SC1091
    [ -s "/usr/share/nvm/init-nvm.sh" ] && . "/usr/share/nvm/init-nvm.sh" || true

    command -v nvm >/dev/null 2>&1 || die "nvm not found after installation."

    local resolved_node="${NODE_VERSION}"
    if [ -z "${resolved_node}" ]; then
        if [ -f "${CLONE_DIR}/.nvmrc" ]; then
            resolved_node="$(tr -d '\n' < "${CLONE_DIR}/.nvmrc")"
            log_info "Using Node version from ${CLONE_DIR}/.nvmrc: ${resolved_node}"
        else
            resolved_node="--lts"
            log_info "No .nvmrc found, defaulting to Node ${resolved_node}"
        fi
    else
        log_info "Using Node version from --node flag: ${resolved_node}"
    fi

    nvm install ${resolved_node}
    nvm use ${resolved_node}
    local nodev
    nodev="$(node -v)"
    log_info "Using Node ${nodev}"
}

install_nx_and_deps() {
    log_info "Installing Nx CLI globally..."
    npm install -g nx || die "Failed to install Nx globally"
}

clone_or_update_repo() {
    if [ -d "${CLONE_DIR}/.git" ]; then
        log_info "Repository exists at ${CLONE_DIR}. Fetching latest..."
        git -C "${CLONE_DIR}" fetch --all --prune --tags

        # Determine what to checkout for existing repo
        local chosen_url
        if [ -n "${REPO_URL}" ]; then
            chosen_url="${REPO_URL}"
        else
            chosen_url="${REPO_URL_SSH_DEFAULT}"
        fi

        if [ -n "${REF}" ]; then
            git -C "${CLONE_DIR}" checkout "${REF}" || {
                log_warn "Failed to checkout ${REF}, trying to fetch it..."
                git -C "${CLONE_DIR}" fetch origin "${REF}" 2>/dev/null || true
                git -C "${CLONE_DIR}" checkout "${REF}" || die "Failed to checkout ${REF}"
            }
        else
            # Determine latest tag for existing repo too
            local checkout_ref
            checkout_ref="$(get_latest_tag "${chosen_url}")" || {
                log_warn "Could not determine latest tag, falling back to main branch"
                checkout_ref="main"
            }
            log_info "Using latest tag: ${checkout_ref}"
            git -C "${CLONE_DIR}" checkout "${checkout_ref}" || {
                log_warn "Failed to checkout ${checkout_ref}, trying to fetch it..."
                git -C "${CLONE_DIR}" fetch origin "${checkout_ref}" 2>/dev/null || true
                git -C "${CLONE_DIR}" checkout "${checkout_ref}" || die "Failed to checkout ${checkout_ref}"
            }
        fi
    else
        local chosen_url
        if [ -n "${REPO_URL}" ]; then
            chosen_url="${REPO_URL}"
        else
            chosen_url="${REPO_URL_SSH_DEFAULT}"
        fi

        log_info "Preparing to clone ${chosen_url} into ${CLONE_DIR}..."

        # Add host to known_hosts to avoid interactive prompt if possible
        if command -v ssh-keyscan >/dev/null 2>&1; then
            local host
            if echo "${chosen_url}" | grep -q '^git@'; then
                host="$(echo "${chosen_url}" | sed -E 's#^git@([^:]+):.*#\1#')"
            elif echo "${chosen_url}" | grep -q '^https?://'; then
                host="$(echo "${chosen_url}" | sed -E 's#^https?://([^/]+)/.*#\1#')"
            else
                host="github.com"
            fi
            mkdir -p "$HOME/.ssh"
            touch "$HOME/.ssh/known_hosts"
            ssh-keyscan -H "$host" 2>/dev/null >> "$HOME/.ssh/known_hosts" || true
        fi

        # Determine what to checkout
        local checkout_ref="${REF}"
        if [ -z "${checkout_ref}" ]; then
            log_info "No ref specified, determining latest tag..."
            checkout_ref="$(get_latest_tag "${chosen_url}")" || {
                log_warn "Could not determine latest tag, falling back to main branch"
                checkout_ref="main"
            }
            log_info "Using latest tag: ${checkout_ref}"
        fi

        log_info "Cloning via ${chosen_url}..."
        if ! git clone "${chosen_url}" "${CLONE_DIR}"; then
            if echo "${chosen_url}" | grep -q '^git@'; then
                # Fallback to HTTPS
                local https_url
                if [ "${chosen_url}" = "${REPO_URL_SSH_DEFAULT}" ]; then
                    https_url="${REPO_URL_HTTPS_DEFAULT}"
                else
                    https_url="$(echo "${chosen_url}" | sed -E 's#^git@([^:]+):(.+)#https://\1/\2#')"
                fi
                log_warn "SSH clone failed. Falling back to HTTPS: ${https_url}"
                git clone "${https_url}" "${CLONE_DIR}" || die "Failed to clone repository via HTTPS as well."
            else
                die "Failed to clone repository: ${chosen_url}"
            fi
        fi

        # Fetch tags and checkout the specified ref
        git -C "${CLONE_DIR}" fetch --tags
        git -C "${CLONE_DIR}" checkout "${checkout_ref}" || {
            log_warn "Failed to checkout ${checkout_ref}, trying to fetch it..."
            git -C "${CLONE_DIR}" fetch origin "${checkout_ref}" 2>/dev/null || true
            git -C "${CLONE_DIR}" checkout "${checkout_ref}" || die "Failed to checkout ${checkout_ref}"
        }
        log_info "Checked out ${checkout_ref}"
    fi
}

init_new_repo() {
    log_info "Initializing new repository..."

    # Remove existing .git folder
    if [ -d .git ]; then
        log_info "Removing existing .git folder..."
        rm -rf .git
    fi

    # Initialize new repository with main branch
    git init -b main
    git add .

    # Create initial commit with conventional commit format
    local commit_msg="feat: initial workspace setup

- Install system prerequisites and build tools
- Setup Node.js via nvm with workspace .nvmrc
- Install Nx CLI and workspace dependencies
- Initialize new git repository

Co-authored-by: install.sh <install@devkit>"

    git commit -m "${commit_msg}" || {
        log_warn "Failed to create initial commit. Repository initialized but uncommitted."
        return 0
    }

    log_info "New repository initialized with initial commit."
}

setup_workspace() {
    log_info "Setting up workspace dependencies..."
    cd "${CLONE_DIR}"

    # Ensure nvm in subshell
    [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
    # Respect project's .nvmrc if available
    if [ -f .nvmrc ]; then
        nvm install >/dev/null 2>&1 || true
        nvm use >/dev/null 2>&1 || true
    fi

    if [ -f package.json ]; then
        npm ci || npm install
    else
        log_warn "No package.json found; skipping npm install."
    fi

    if command -v nx >/dev/null 2>&1; then
        npx nx reset || true
    fi
}

trap 'log_error "An error occurred. See logs above."' ERR

log_info "Starting installation and setup..."
ensure_sudo
install_prereqs
clone_or_update_repo
install_nvm_and_node
install_nx_and_deps
setup_workspace
init_new_repo

log_info "TSEF installed and workspace is ready in '${CLONE_DIR}'."
