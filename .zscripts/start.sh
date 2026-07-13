#!/bin/sh

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR"

# 存储所有子进程的 PID
pids=""

# 清理函数：优雅关闭所有服务
cleanup() {
    echo ""
    echo "Stopping all services..."

    # 发送 SIGTERM 信号给所有子进程
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            service_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
            echo "   Stopping $pid ($service_name)..."
            kill -TERM "$pid" 2>/dev/null
        fi
    done

    # 等待所有进程退出（最多等待 5 秒）
    sleep 1
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            timeout=4
            while [ $timeout -gt 0 ] && kill -0 "$pid" 2>/dev/null; do
                sleep 1
                timeout=$((timeout - 1))
            done
            if kill -0 "$pid" 2>/dev/null; then
                echo "   Force killing $pid..."
                kill -KILL "$pid" 2>/dev/null
            fi
        fi
    done

    echo "All services stopped"
    exit 0
}

echo "Starting all services..."
echo ""

# 切换到构建目录
cd "$BUILD_DIR" || exit 1

ls -lah

DEFAULT_PACKAGED_DB_PATH="/app/db/custom.db"
DEFAULT_PACKAGED_DATABASE_URL="file:$DEFAULT_PACKAGED_DB_PATH"

# 启动 Next.js 服务器
if [ -f "./next-service-dist/server.js" ]; then
    echo "Starting Next.js server..."
    cd next-service-dist/ || exit 1

    # 设置环境变量
    export NODE_ENV=production
    export PORT="${PORT:-3000}"
    export HOSTNAME="${HOSTNAME:-0.0.0.0}"
    export DATABASE_URL="${DATABASE_URL:-$DEFAULT_PACKAGED_DATABASE_URL}"

    if [ "$DATABASE_URL" = "$DEFAULT_PACKAGED_DATABASE_URL" ]; then
        if [ ! -f "$DEFAULT_PACKAGED_DB_PATH" ]; then
            echo "ERROR: Packaged database not found: $DEFAULT_PACKAGED_DB_PATH"
            exit 1
        fi
        echo "Using packaged database: $DEFAULT_PACKAGED_DB_PATH"
    else
        echo "Using external database: $DATABASE_URL"
    fi

    # 后台启动 Next.js
    bun server.js &
    NEXT_PID=$!
    pids="$NEXT_PID"

    # 等待一小段时间检查进程是否成功启动
    sleep 1
    if ! kill -0 "$NEXT_PID" 2>/dev/null; then
        echo "ERROR: Next.js server failed to start"
        exit 1
    else
        echo "Next.js server started (PID: $NEXT_PID, Port: $PORT)"
    fi

    cd ../
else
    echo "WARNING: Next.js server file not found: ./next-service-dist/server.js"
fi

# 启动 mini-services
if [ -f "./mini-services-start.sh" ]; then
    echo "Starting mini-services..."

    sh ./mini-services-start.sh &
    MINI_PID=$!
    pids="$pids $MINI_PID"

    sleep 1
    if ! kill -0 "$MINI_PID" 2>/dev/null; then
        echo "WARNING: mini-services may have failed, continuing..."
    else
        echo "mini-services started (PID: $MINI_PID)"
    fi
elif [ -d "./mini-services-dist" ]; then
    echo "WARNING: mini-services directory exists but no start script"
else
    echo "INFO: No mini-services, skipping"
fi

# 启动 Caddy（如果存在 Caddyfile 且端口未被占用）
if [ -f "Caddyfile" ]; then
    # 检查 caddy 是否可用
    if command -v caddy >/dev/null 2>&1; then
        echo "Starting Caddy..."
        # 尝试在后台启动 Caddy
        if caddy run --config Caddyfile --adapter caddyfile 2>/dev/null; then
            :
        fi &
        CADDY_PID=$!
        sleep 2
        if kill -0 "$CADDY_PID" 2>/dev/null; then
            echo "Caddy started (PID: $CADDY_PID)"
            pids="$pids $CADDY_PID"
        else
            echo "WARNING: Caddy failed to start (port may already be in use by platform proxy)"
            echo "Platform proxy will handle incoming traffic on FC_CUSTOM_LISTEN_PORT"
        fi
    else
        echo "INFO: Caddy not found, skipping"
    fi
else
    echo "INFO: No Caddyfile, skipping Caddy"
fi

echo ""
echo "All services started!"
echo ""

# 保持进程运行，等待所有子进程
trap cleanup EXIT INT TERM
wait