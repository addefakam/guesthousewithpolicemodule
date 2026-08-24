#!/bin/bash
# =============================================================================
# Package GHMS for Local Server Deployment
# Run this on any machine with the project to create the deployable archive
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }

# Detect project directory (script lives in scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."
OUTPUT="${SCRIPT_DIR}/ghms-deploy.tar.gz"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"

log_info "Packaging GHMS from: $PROJECT_DIR"

# Create the archive excluding unnecessary files
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='db' \
    --exclude='.git' \
    --exclude='tool-results' \
    --exclude='download' \
    --exclude='*.log' \
    --exclude='scripts/ghms-deploy.tar.gz' \
    --exclude='scripts/ghms_figures' \
    --exclude='scripts/ghms_proposal*' \
    --exclude='scripts/proposal_*' \
    --exclude='scripts/merge_pdf*' \
    --exclude='scripts/generate_*' \
    --exclude='scripts/search_*.json' \
    --exclude='scripts/tellbirr_*' \
    --exclude='scripts/hahu_*' \
    --exclude='scripts/ashewa_*' \
    --exclude='scripts/fix_*' \
    -czf "$OUTPUT" .

SIZE=$(du -h "$OUTPUT" | cut -f1)
log_ok "Archive created: $OUTPUT ($SIZE)"
echo ""
echo "── Next steps for LOCAL server deployment ──────────────────────────────"
echo "  1. Copy these 2 files to the server (USB, SCP, etc.):"
echo "     - $OUTPUT"
echo "     - ${SCRIPT_DIR}/setup-local.sh"
echo ""
echo "  2. On the server, run:"
echo "     chmod +x setup-local.sh"
echo "     sudo ./setup-local.sh"
echo ""
echo "  NOTE: If the server has internet, setup-local.sh will clone from"
echo "        GitHub directly — no archive needed. Just run the script."
