#!/bin/bash
# =============================================================================
# GHMS — One-Click Local Server Setup
# =============================================================================
# For the owner's local server (Ubuntu/Debian).
# This script automates EVERYTHING:
#   - Installs Node.js + PostgreSQL + Git (if missing)
#   - Clones the project from GitHub (or copies from USB/drive)
#   - Creates database & user
#   - Generates .env file
#   - Installs npm dependencies
#   - Pushes Prisma schema & generates client
#   - Starts the application
#
# Usage:
#   chmod +x setup-local.sh
#   sudo ./setup-local.sh
#
# Options:
#   --skip-deps      Skip installing system packages (if already installed)
#   --production     Build & run in production mode (default: development)
#   --port PORT      Use custom port (default: 3001 dev / 3000 production)
# =============================================================================

set -euo pipefail

# ─── Parse Arguments ──────────────────────────────────────────────────────────
SKIP_DEPS=false
PRODUCTION=false
CUSTOM_PORT=""

for arg in "$@"; do
  case $arg in
    --skip-deps)    SKIP_DEPS=true ;;
    --production)   PRODUCTION=true ;;
    --port)         shift; CUSTOM_PORT="${1:-}" ;;
    --help|-h)
      echo "Usage: sudo ./setup-local.sh [--skip-deps] [--production] [--port PORT]"
      exit 0
      ;;
  esac
done

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${CYAN}${BOLD}$1${NC}"; }

# ─── Check root ───────────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  log_error "Please run as root: sudo ./setup-local.sh"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║        GHMS — Guest House Management System Local Setup               ║"
echo "║        One-Click Automated Installation                               ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# ─── Configuration ────────────────────────────────────────────────────────────
APP_USER="ghms"
APP_DIR="/home/${APP_USER}/guesthousewithpolicemodule"
DB_NAME="ghms_db"
DB_USER="ghms"
REPO_URL="https://github.com/addefakam/guesthousewithpolicemodule.git"

# Generate a secure random password for the database
DB_PASSWORD=$(openssl rand -base64 16 | tr -d '=/+' | head -c 16)

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Port configuration
if [ "$PRODUCTION" = true ]; then
  APP_PORT="${CUSTOM_PORT:-3000}"
else
  APP_PORT="${CUSTOM_PORT:-3001}"
fi

echo "── Configuration ─────────────────────────────────────────────────────"
echo "  Install directory:   $APP_DIR"
echo "  Database:            $DB_NAME"
echo "  DB user:             $DB_USER"
echo "  DB password:         $DB_PASSWORD  (auto-generated)"
echo "  Mode:                $([ "$PRODUCTION" = true ] && echo 'Production' || echo 'Development')"
echo "  Port:                $APP_PORT"
echo "─────────────────────────────────────────────────────────────────────"
echo ""
read -p "Press Enter to start installation, or Ctrl+C to cancel..."
echo ""

START_TIME=$(date +%s)

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: Install System Dependencies
# ═══════════════════════════════════════════════════════════════════════════
log_step "═══ STEP 1/7: System Dependencies ═══"

if [ "$SKIP_DEPS" = true ]; then
  log_warn "Skipping system package installation (--skip-deps)"
else
  log_info "Updating package lists..."
  apt update -qq 2>&1 | tail -1

  # Check & install Git
  if ! command -v git &>/dev/null; then
    log_info "Installing Git..."
    apt install -y git -qq
    log_ok "Git installed: $(git --version)"
  else
    log_ok "Git already installed: $(git --version)"
  fi

  # Check & install Node.js (v20 LTS)
  if command -v node &>/dev/null && node -v | grep -qE 'v(18|20|22|24)\.'; then
    log_ok "Node.js already installed: $(node -v)"
  else
    log_info "Installing Node.js 20 LTS..."
    # Remove any old NodeSource repo to avoid conflicts
    rm -f /etc/apt/sources.list.d/nodesource.list 2>/dev/null || true
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -3
    apt install -y nodejs -qq 2>&1 | tail -1
    log_ok "Node.js installed: $(node -v)"
  fi

  # Check & install npm
  if ! command -v npm &>/dev/null; then
    log_info "Installing npm..."
    apt install -y npm -qq
  fi
  log_ok "npm version: $(npm -v)"

  # Check & install PostgreSQL
  if command -v psql &>/dev/null; then
    log_ok "PostgreSQL already installed: $(psql --version)"
  else
    log_info "Installing PostgreSQL..."
    apt install -y postgresql postgresql-contrib -qq 2>&1 | tail -1
    log_ok "PostgreSQL installed: $(psql --version)"
  fi

  # Install build essentials (needed for some npm packages)
  if ! command -v cc &>/dev/null; then
    log_info "Installing build-essential..."
    apt install -y build-essential -qq 2>&1 | tail -1
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Create Application User
# ═══════════════════════════════════════════════════════════════════════════
log_step "═══ STEP 2/7: Application User ═══"

if id "$APP_USER" &>/dev/null; then
  log_ok "User '$APP_USER' already exists"
else
  useradd -m -s /bin/bash "$APP_USER"
  log_ok "Created user: $APP_USER"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Setup Database
# ═══════════════════════════════════════════════════════════════════════════
log_step "═══ STEP 3/7: Database Setup ═══"

# Ensure PostgreSQL is running
systemctl enable postgresql -q 2>/dev/null || true
systemctl start postgresql 2>/dev/null || true

# Wait for PostgreSQL to be ready
for i in $(seq 1 10); do
  if su - postgres -c "pg_isready" &>/dev/null; then
    break
  fi
  log_info "Waiting for PostgreSQL to start... ($i/10)"
  sleep 1
done

# Create database user and database
su - postgres -c "psql" <<EOSQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    RAISE NOTICE 'Created user ${DB_USER}';
  ELSE
    ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    RAISE NOTICE 'User ${DB_USER} exists, password updated';
  END IF;
END \$\$;

DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') THEN
    CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
    RAISE NOTICE 'Created database ${DB_NAME}';
  ELSE
    ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
    RAISE NOTICE 'Database ${DB_NAME} exists, owner updated';
  END IF;
END \$\$;

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOSQL

log_ok "Database '$DB_NAME' and user '$DB_USER' ready"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Clone / Update Project
# ═══════════════════════════════════════════════════════════════════════════
log_step "═══ STEP 4/7: Project Files ═══"

if [ -d "$APP_DIR/.git" ]; then
  log_info "Project directory exists, pulling latest changes..."
  su - "$APP_USER" -c "cd $APP_DIR && git pull origin main" 2>&1 | tail -3
  log_ok "Project updated"
else
  if [ -d "$APP_DIR" ]; then
    log_warn "Directory $APP_DIR exists but is not a git repo — backing up and recloning"
    mv "$APP_DIR" "${APP_DIR}.bak.$(date +%s)" 2>/dev/null || true
  fi
  log_info "Cloning repository..."
  su - "$APP_USER" -c "git clone $REPO_URL $APP_DIR" 2>&1 | tail -3
  log_ok "Project cloned to $APP_DIR"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: Configure Environment
# ═══════════════════════════════════════════════════════════════════════════
log_step "═══ STEP 5/7: Environment Configuration ═══"

cat > "${APP_DIR}/.env" <<ENVFILE
# ─── GHMS Environment Configuration ─────────────────────────────────────
# Auto-generated by setup-local.sh on $(date)

DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=$([ "$PRODUCTION" = true ] && echo 'production' || echo 'development')
ENVFILE

chmod 600 "${APP_DIR}/.env"
chown ${APP_USER}:${APP_USER} "${APP_DIR}/.env"
log_ok ".env file created at ${APP_DIR}/.env"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: Install Dependencies & Setup Database Schema
# ═══════════════════════════════════════════════════════════════════════════
log_step "═══ STEP 6/7: Install & Build ═══"

log_info "Running npm install (this may take a few minutes)..."
su - "$APP_USER" -c "cd $APP_DIR && npm install" 2>&1 | tail -3
log_ok "Dependencies installed"

log_info "Pushing database schema with Prisma..."
su - "$APP_USER" -c "cd $APP_DIR && npx prisma db push --accept-data-loss" 2>&1 | tail -5
log_ok "Database schema pushed"

log_info "Generating Prisma client..."
su - "$APP_USER" -c "cd $APP_DIR && npx prisma generate" 2>&1 | tail -3
log_ok "Prisma client generated"

# Run fix script if it exists
if [ -f "${APP_DIR}/scripts/fix-prisma-sql.js" ]; then
  log_info "Running Prisma fix script..."
  su - "$APP_USER" -c "cd $APP_DIR && node scripts/fix-prisma-sql.js" 2>&1
  log_ok "Prisma fix script complete"
fi

# Production build
if [ "$PRODUCTION" = true ]; then
  log_info "Building for production (this may take a few minutes)..."
  su - "$APP_USER" -c "cd $APP_DIR && npm run build" 2>&1 | tail -5
  log_ok "Production build complete"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7: Create Systemd Service & Start
# ═══════════════════════════════════════════════════════════════════════════
log_step "═══ STEP 7/7: Service Setup & Start ═══"

# Kill any existing process on the port
if command -v fuser &>/dev/null; then
  fuser -k ${APP_PORT}/tcp 2>/dev/null || true
fi

# Create log directory
mkdir -p /var/log/ghms
chown ${APP_USER}:${APP_USER} /var/log/ghms

# Create systemd service
if [ "$PRODUCTION" = true ]; then
  EXEC_CMD="/usr/bin/node .next/standalone/server.js -p ${APP_PORT}"
else
  EXEC_CMD="/usr/bin/npx next dev -p ${APP_PORT}"
fi

cat > /etc/systemd/system/ghms.service <<SYSTEMD
[Unit]
Description=GHMS Guest House Management System
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${EXEC_CMD}
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=$([ "$PRODUCTION" = true ] && echo 'production' || echo 'development')
Environment=HOSTNAME=0.0.0.0
Environment=PORT=${APP_PORT}
StandardOutput=append:/var/log/ghms/ghms.log
StandardError=append:/var/log/ghms/ghms-error.log

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable ghms -q
systemctl start ghms

# Wait and check
log_info "Waiting for the application to start..."
sleep 5

if systemctl is-active --quiet ghms; then
  log_ok "GHMS service is RUNNING"
else
  log_warn "Service not active yet. Check logs: journalctl -u ghms -n 20"
fi

# ═══════════════════════════════════════════════════════════════════════════
# VERIFICATION & SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
END_TIME=$(date +%s)
DURATION=$(( (END_TIME - START_TIME) / 60 ))

echo ""
echo "═════════════════════════════════════════════════════════════════════════"
echo "  Installation Complete!"
echo "═════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Time taken:     ~${DURATION} minutes"
echo "  App URL:        http://localhost:${APP_PORT}"
echo "  Network URL:    http://<your-server-ip>:${APP_PORT}"
echo ""
echo "  Database:"
echo "    Name:         ${DB_NAME}"
echo "    User:         ${DB_USER}"
echo "    Password:     ${DB_PASSWORD}"
echo "    Connection:   psql -U ${DB_USER} -d ${DB_NAME} -h localhost"
echo ""
echo "  ─── Useful Commands ─────────────────────────────────────────────────"
echo "    Check status:      sudo systemctl status ghms"
echo "    View logs:         sudo journalctl -u ghms -f"
echo "    View app logs:     tail -f /var/log/ghms/ghms.log"
echo "    Restart app:       sudo systemctl restart ghms"
echo "    Stop app:          sudo systemctl stop ghms"
echo "    Update project:    cd ${APP_DIR} && git pull && npm install && sudo systemctl restart ghms"
echo "    DB console:        sudo -u postgres psql -d ${DB_NAME}"
echo "    Reset database:    cd ${APP_DIR} && npx prisma db push --force-reset"
echo ""
echo "  ─── File Locations ──────────────────────────────────────────────────"
echo "    Project:          ${APP_DIR}"
echo "    Env file:         ${APP_DIR}/.env"
echo "    Systemd service:  /etc/systemd/system/ghms.service"
echo "    App logs:         /var/log/ghms/ghms.log"
echo "    Error logs:       /var/log/ghms/ghms-error.log"
echo ""
echo "  ─── To access from other computers on the network ────────────────────"
echo "    Make sure port ${APP_PORT} is open in your firewall:"
echo "    sudo ufw allow ${APP_PORT}/tcp"
echo "    Then open: http://<SERVER_LOCAL_IP>:${APP_PORT}"
echo ""
echo "═════════════════════════════════════════════════════════════════════════"
