#!/bin/bash
# =============================================================================
# GHMS — Complete Deployment Script for Fresh Ubuntu Server
# =============================================================================
# Usage:
#   1. Copy this script + your project tar.gz to the server
#   2. chmod +x deploy-ghms.sh
#   3. sudo ./deploy-ghms.sh
#
# Prerequisites:
#   - Fresh Ubuntu 22.04/24.04 Server installation
#   - Public IP configured
#   - SSH access
#   - Project tar.gz in the same directory (ghms-deploy.tar.gz)
# =============================================================================

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Check root ───────────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  log_error "Please run as root: sudo ./deploy-ghms.sh"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║          GHMS Deployment Script — Local Server Setup           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# ─── Collect Configuration ────────────────────────────────────────────────────
log_info "Gathering configuration..."

# Domain
read -p "Enter your domain name (e.g., ghms.yourdomain.com): " DOMAIN
[ -z "$DOMAIN" ] && log_error "Domain is required"

# Public IP verification
PUBLIC_IP=$(curl -s4 ifconfig.me 2>/dev/null || curl -s4 icanhazip.com 2>/dev/null)
log_info "Detected public IP: $PUBLIC_IP"

# Database password
while true; do
  read -sp "Set PostgreSQL password for 'ghms' user (min 12 chars): " DB_PASSWORD
  echo ""
  [ ${#DB_PASSWORD} -ge 12 ] && break
  log_warn "Password must be at least 12 characters. Try again."
done

# JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || 
  openssl rand -hex 32)
log_ok "Generated JWT secret"

# Project archive
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARCHIVE="${SCRIPT_DIR}/ghms-deploy.tar.gz"
if [ ! -f "$ARCHIVE" ]; then
  log_error "Project archive not found at $ARCHIVE\n  Create it with: tar --exclude='node_modules' --exclude='.next' --exclude='db' --exclude='.git' --exclude='tool-results' --exclude='download' -czf ghms-deploy.tar.gz ."
fi

# App user
APP_USER="ghms"
APP_DIR="/home/${APP_USER}/ghms-clone"

# Confirmation
echo ""
echo "── Configuration Summary ──────────────────────────────────────"
echo "  Domain:          $DOMAIN"
echo "  Public IP:       $PUBLIC_IP"
echo "  App user:        $APP_USER"
echo "  Install dir:     $APP_DIR"
echo "  DB name:         ghms_db"
echo "  DB user:         ghms"
echo "  Archive:         $ARCHIVE"
echo "──────────────────────────────────────────────────────────────"
echo ""
read -p "Proceed with deployment? (yes/no): " CONFIRM
[ "$CONFIRM" != "yes" ] && log_error "Aborted by user"

echo ""
log_info "Starting deployment... This will take 10-20 minutes."
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: System Update
# ═══════════════════════════════════════════════════════════════════════════
log_info "[1/9] Updating system packages..."
apt update -qq
apt upgrade -y -qq
log_ok "System updated"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Install Node.js 20 LTS
# ═══════════════════════════════════════════════════════════════════════════
log_info "[2/9] Installing Node.js 20 LTS..."
if command -v node &>/dev/null && node -v | grep -q "v20"; then
  log_ok "Node.js $(node -v) already installed, skipping"
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  log_ok "Node.js $(node -v) installed"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Install & Configure PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════
log_info "[3/9] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Create database and user
su - postgres -c "psql" <<EOF
DO \$\$ BEGIN
  CREATE USER ghms WITH PASSWORD '${DB_PASSWORD}';
EXCEPTION WHEN duplicate_object THEN
  ALTER USER ghms WITH PASSWORD '${DB_PASSWORD}';
END \$\$;

DO \$\$ BEGIN
  CREATE DATABASE ghms_db OWNER ghms;
EXCEPTION WHEN duplicate_database THEN
  ALTER DATABASE ghms_db OWNER TO ghms;
END \$\$;

GRANT ALL PRIVILEGES ON DATABASE ghms_db TO ghms;
EOF

# Allow local peer + password auth for ghms user
PG_HBA="/etc/postgresql/$(ls /etc/postgresql/ | head -1)/main/pg_hba.conf"
if ! grep -q "ghms" "$PG_HBA"; then
  echo "host    ghms_db    ghms    127.0.0.1/32    scram-sha-256" >> "$PG_HBA"
  echo "host    ghms_db    ghms    ::1/128         scram-sha-256" >> "$PG_HBA"
  systemctl restart postgresql
fi

log_ok "PostgreSQL configured (db: ghms_db, user: ghms)"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Create App User & Setup Project
# ═══════════════════════════════════════════════════════════════════════════
log_info "[4/9] Setting up application user and project..."

if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
  log_ok "Created user: $APP_USER"
else
  log_ok "User $APP_USER already exists"
fi

# Create project directory
mkdir -p "$APP_DIR"

# Extract project
log_info "Extracting project archive..."
tar -xzf "$ARCHIVE" -C "$APP_DIR"
chown -R ${APP_USER}:${APP_USER} "$APP_DIR"
log_ok "Project extracted to $APP_DIR"

# Create .env file
log_info "Creating .env production file..."
cat > "${APP_DIR}/.env" <<ENVFILE
# ─── GHMS Production Environment ─────────────────────────────────────
DATABASE_URL=postgresql://ghms:${DB_PASSWORD}@localhost:5432/ghms_db
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
ENVFILE

chmod 600 "${APP_DIR}/.env"
chown ${APP_USER}:${APP_USER} "${APP_DIR}/.env"
log_ok ".env created"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: Install Dependencies & Build
# ═══════════════════════════════════════════════════════════════════════════
log_info "[5/9] Installing npm dependencies (this takes a few minutes)..."
cd "$APP_DIR"
su - "$APP_USER" -c "cd $APP_DIR && npm install 2>&1 | tail -5"
log_ok "Dependencies installed"

log_info "Building Next.js standalone server (this also takes a few minutes)..."
su - "$APP_USER" -c "cd $APP_DIR && npm run build 2>&1 | tail -10"
log_ok "Build complete"

# Copy static assets for standalone mode
log_info "Copying static assets for standalone mode..."
cp -r "${APP_DIR}/public" "${APP_DIR}/.next/standalone/public"
cp -r "${APP_DIR}/.next/static" "${APP_DIR}/.next/standalone/.next/static"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}/.next/standalone"
log_ok "Static assets copied"

# Quick test — can the server start?
log_info "Testing server startup..."
if su - "$APP_USER" -c "cd $APP_DIR && timeout 10 node .next/standalone/server.js -p 3000" 2>&1 | grep -q "Ready"; then
  log_ok "Server starts successfully"
else
  log_warn "Server did not show 'Ready' in 10s — may need manual check. Continuing..."
fi
# Kill any lingering node process from the test
pkill -f "standalone/server.js" 2>/dev/null || true
sleep 2

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: Install & Configure Caddy
# ═══════════════════════════════════════════════════════════════════════════
log_info "[6/9] Installing Caddy..."

# Install Caddy APT repo
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  tee /etc/apt/sources.list.d/caddy-stable.list
apt update -qq
apt install -y caddy

# Configure Caddyfile
log_info "Configuring Caddy for ${DOMAIN}..."
mkdir -p /var/log/caddy
cat > /etc/caddy/Caddyfile <<CADDYFILE
${DOMAIN} {
    reverse_proxy localhost:3000

    # Security headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    # Logging
    log {
        output file /var/log/caddy/ghms-access.log {
            roll_size 50mb
            roll_keep 5
        }
        format console
    }
}
CADDYFILE

# Validate Caddy config
caddy validate --config /etc/caddy/Caddyfile 2>&1 && log_ok "Caddy config valid" || log_error "Caddy config invalid"

# Start Caddy
systemctl enable caddy
systemctl restart caddy
log_ok "Caddy installed and configured"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7: Create Keepalive Script & Systemd Service
# ═══════════════════════════════════════════════════════════════════════════
log_info "[7/9] Setting up GHMS systemd service..."

# Create keepalive script
cat > "${APP_DIR}/scripts/keepalive-systemd.sh" <<'KEEPALIVE'
#!/bin/bash
cd /home/ghms/ghms-clone
export NODE_OPTIONS="--max-old-space-size=512"
export HOSTNAME=0.0.0.0
export NODE_ENV=production

SERVER=".next/standalone/server.js"

while true; do
  if [ -f "$SERVER" ]; then
    node "$SERVER" -p 3000 2>&1 | tee -a /var/log/ghms/server.log
  else
    echo "$(date): Standalone server not found at $SERVER" >> /var/log/ghms/server.log
    sleep 10
  fi
  EXIT_CODE=$?
  echo "$(date): Server exited with code $EXIT_CODE, restarting in 2s..." >> /var/log/ghms/server.log
  sleep 2
done
KEEPALIVE

chmod +x "${APP_DIR}/scripts/keepalive-systemd.sh"
chown ${APP_USER}:${APP_USER} "${APP_DIR}/scripts/keepalive-systemd.sh"

# Create log directory
mkdir -p /var/log/ghms
chown ${APP_USER}:${APP_USER} /var/log/ghms

# Create systemd service
cat > /etc/systemd/system/ghms.service <<SYSTEMD
[Unit]
Description=GHMS Next.js Application
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=ghms
Group=ghms
WorkingDirectory=/home/ghms/ghms-clone
ExecStart=/home/ghms/ghms-clone/scripts/keepalive-systemd.sh
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=HOSTNAME=0.0.0.0
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable ghms
systemctl start ghms

# Wait a moment and check
sleep 3
if systemctl is-active --quiet ghms; then
  log_ok "GHMS service is running"
else
  log_warn "GHMS service not active yet — check: journalctl -u ghms -n 50"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 8: Firewall
# ═══════════════════════════════════════════════════════════════════════════
log_info "[8/9] Configuring firewall..."

# Don't touch existing ufw rules — just ensure our ports are allowed
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP (Caddy)'
ufw allow 443/tcp   comment 'HTTPS (Caddy)'

# Enable if not already
if ufw status | grep -q "inactive"; then
  echo "y" | ufw enable
fi

log_ok "Firewall configured (SSH:22, HTTP:80, HTTPS:443)"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 9: Verification
# ═══════════════════════════════════════════════════════════════════════════
log_info "[9/9] Running verification checks..."
echo ""

PASS=0
FAIL=0

check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    log_ok "$label"
    ((PASS++))
  else
    log_warn "$label — FAILED"
    ((FAIL++))
  fi
}

check "PostgreSQL is running"       "systemctl is-active postgresql"
check "GHMS service is running"     "systemctl is-active ghms"
check "Caddy is running"            "systemctl is-active caddy"
check "Port 80 is listening"        "ss -tlnp | grep -q ':80 '
check "Port 443 is listening"       "ss -tlnp | grep -q ':443 '"
check "Port 3000 is internal"       "ss -tlnp | grep -q '127.0.0.1:3000 \|0.0.0.0:3000'"
check "Server responds on :3000"    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q 200"

if command -v dig &>/dev/null; then
  CURRENT_DNS=$(dig +short "$DOMAIN" A 2>/dev/null | tail -1)
  if [ "$CURRENT_DNS" = "$PUBLIC_IP" ]; then
    log_ok "DNS points to $PUBLIC_IP"
    ((PASS++))
  else
    log_warn "DNS for $DOMAIN currently points to ${CURRENT_DNS:-not set} — should be $PUBLIC_IP"
    log_warn "Set an A record: $DOMAIN → $PUBLIC_IP at your domain registrar"
    ((FAIL++))
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  Deployment Complete!"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "  Passed: $PASS    Failed: $FAIL"
echo ""
echo "  ─── Access ─────────────────────────────────────────────────────"
echo "  URL:         https://${DOMAIN}"
echo "  Default login: admin / Admin@2024"
echo ""
echo "  ─── Useful Commands ────────────────────────────────────────────"
echo "  View GHMS logs:    journalctl -u ghms -f"
echo "  View Caddy logs:   journalctl -u caddy -f"
echo "  View access logs:  tail -f /var/log/caddy/ghms-access.log"
echo "  Restart GHMS:      sudo systemctl restart ghms"
echo "  Restart Caddy:     sudo systemctl restart caddy"
echo "  DB console:        sudo -u postgres psql -d ghms_db"
echo ""
echo "  ─── File Locations ─────────────────────────────────────────────"
echo "  Project:       $APP_DIR"
echo "  Env file:      ${APP_DIR}/.env"
echo "  Caddyfile:     /etc/caddy/Caddyfile"
echo "  Systemd:       /etc/systemd/system/ghms.service"
echo "  Keepalive:     ${APP_DIR}/scripts/keepalive-systemd.sh"
echo "  App logs:      /var/log/ghms/server.log"
echo ""
if [ $FAIL -gt 0 ]; then
  log_warn "Some checks failed. Review the output above."
  log_warn "DNS/SSL may take a few minutes to propagate after setting your A record."
fi
echo "═══════════════════════════════════════════════════════════════════════"
