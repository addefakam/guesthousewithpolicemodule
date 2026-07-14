#!/bin/bash

# 将 stderr 重定向到 stdout，避免 execute_command 因为 stderr 输出而报错
exec 2>&1

set -e

# 获取脚本所在目录（.zscripts 目录，即 workspace-agent/.zscripts）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Next.js 项目路径
NEXTJS_PROJECT_DIR="/home/z/my-project"

# 检查 Next.js 项目目录是否存在
if [ ! -d "$NEXTJS_PROJECT_DIR" ]; then
    echo "❌ 错误: Next.js 项目目录不存在: $NEXTJS_PROJECT_DIR"
    exit 1
fi

echo "🚀 开始构建 Next.js 应用..."
echo "📁 Next.js 项目路径: $NEXTJS_PROJECT_DIR"

# 切换到 Next.js 项目目录
cd "$NEXTJS_PROJECT_DIR" || exit 1

# 设置环境变量
export NEXT_TELEMETRY_DISABLED=1

BUILD_DIR="/tmp/build_fullstack_$BUILD_ID"
echo "📁 清理并创建构建目录: $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 安装依赖
echo "📦 安装依赖..."
bun install

# 生成 Prisma client (explicit, in case postinstall didn't run)
echo "🔧 生成 Prisma client..."
bun run db:generate 2>&1 || npx prisma generate 2>&1

# 构建 Next.js 应用
echo "🔨 构建 Next.js 应用..."
bun run build

# 将所有构建产物复制到临时构建目录
echo "📦 收集构建产物到 $BUILD_DIR..."

# 复制 Next.js standalone 构建输出
if [ -d ".next/standalone" ]; then
    echo "  - 复制 .next/standalone"
    cp -r .next/standalone "$BUILD_DIR/next-service-dist/"
else
    echo "❌ 未找到 .next/standalone 目录"
    exit 1
fi

# 复制 Next.js 静态文件
if [ -d ".next/static" ]; then
    echo "  - 复制 .next/static"
    mkdir -p "$BUILD_DIR/next-service-dist/.next"
    cp -r .next/static "$BUILD_DIR/next-service-dist/.next/"
fi

# 复制 public 目录
if [ -d "public" ]; then
    echo "  - 复制 public"
    cp -r public "$BUILD_DIR/next-service-dist/"
fi

# 复制数据库到 next-service-dist 内部
if [ -f "./db/custom.db" ]; then
    echo "🗄️  复制数据库到 next-service-dist/db/..."
    mkdir -p "$BUILD_DIR/next-service-dist/db"
    cp ./db/custom.db "$BUILD_DIR/next-service-dist/db/custom.db"

    # 同步 schema 确保一致
    DATABASE_URL="file:$BUILD_DIR/next-service-dist/db/custom.db" bun run db:push 2>/dev/null || true
    echo "✅ 数据库已就绪 ($(du -h "$BUILD_DIR/next-service-dist/db/custom.db" | cut -f1))"
else
    echo "❌ 未找到数据库文件 ./db/custom.db"
    exit 1
fi

# 写入 .env — 使用相对路径 file:db/custom.db
echo "DATABASE_URL=file:db/custom.db" > "$BUILD_DIR/next-service-dist/.env"
echo "✅ .env 已写入（相对路径）"

# 复制启动脚本
echo "  - 复制 start.sh 到 $BUILD_DIR"
cp "$SCRIPT_DIR/start.sh" "$BUILD_DIR/start.sh"
chmod +x "$BUILD_DIR/start.sh"
cp "$SCRIPT_DIR/diag.sh" "$BUILD_DIR/diag.sh"
chmod +x "$BUILD_DIR/diag.sh"

# 复制 boot-check.js 用于诊断
cp "$SCRIPT_DIR/boot-check.js" "$BUILD_DIR/next-service-dist/boot-check.js"
echo "  - boot-check.js 已复制"

# 验证关键文件
echo ""
echo "🔍 验证构建产物..."
ERRORS=0
[ ! -f "$BUILD_DIR/next-service-dist/server.js" ] && echo "❌ server.js 缺失" && ERRORS=1
[ ! -f "$BUILD_DIR/next-service-dist/db/custom.db" ] && echo "❌ custom.db 缺失" && ERRORS=1
[ ! -f "$BUILD_DIR/next-service-dist/.env" ] && echo "❌ .env 缺失" && ERRORS=1
[ ! -d "$BUILD_DIR/next-service-dist/node_modules/.prisma" ] && echo "❌ Prisma client 缺失" && ERRORS=1

if [ "$ERRORS" -ne 0 ]; then
    echo "❌ 构建验证失败"
    exit 1
fi
echo "✅ 所有构建产物验证通过"

# 列出 standalone 目录结构（摘要）
echo ""
echo "📁 构建产物结构:"
ls -la "$BUILD_DIR/next-service-dist/" | head -15
echo "..."
echo "node_modules/.prisma/client:"
ls "$BUILD_DIR/next-service-dist/node_modules/.prisma/client/" 2>/dev/null | head -10

# 打包
PACKAGE_FILE="${BUILD_DIR}.tar.gz"
echo ""
echo "📦 打包构建产物到 $PACKAGE_FILE..."
cd "$BUILD_DIR" || exit 1
tar -czf "$PACKAGE_FILE" .
cd - > /dev/null || exit 1

echo ""
echo "✅ 构建完成！所有产物已打包到 $PACKAGE_FILE"
echo "📊 打包文件大小:"
ls -lh "$PACKAGE_FILE"