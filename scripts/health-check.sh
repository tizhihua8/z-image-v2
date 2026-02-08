#!/bin/bash
# ============================================
# Z-Image v3 健康检查脚本 (Docker)
# ============================================
# 用途: 检查 Docker 容器健康状态
# 使用: ./scripts/health-check.sh

set -e

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================"
echo "  Z-Image 健康检查"
echo "========================================${NC}"
echo ""

# ============================================
# 1. 检查 Docker
# ============================================
echo "[1/6] 检查 Docker..."

if ! docker info &> /dev/null; then
    echo -e "${RED}  ✗ Docker 未运行${NC}"
    exit 1
fi

echo "  ✓ Docker 运行正常"

# ============================================
# 2. 检查容器状态
# ============================================
echo "[2/6] 检查容器状态..."

containers=("zimage-server" "zimage-web" "zimage-worker")
all_running=true

for container in "${containers[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo "  ✓ $container 运行中"
    else
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            echo -e "${YELLOW}  ⚠ $container 未运行${NC}"
        else
            echo -e "${YELLOW}  ⚠ $container 不存在${NC}"
        fi
        all_running=false
    fi
done

# ============================================
# 3. 检查后端 API
# ============================================
echo "[3/6] 检查后端 API..."

if docker exec zimage-server curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✓ 后端 API 正常"
else
    echo -e "${RED}  ✗ 后端 API 异常${NC}"
    all_running=false
fi

# ============================================
# 4. 检查前端
# ============================================
echo "[4/6] 检查前端..."

if docker exec zimage-web wget -q -O /dev/null http://localhost:3000 2>&1; then
    echo "  ✓ 前端服务正常"
else
    echo -e "${RED}  ✗ 前端服务异常${NC}"
    all_running=false
fi

# ============================================
# 5. 检查数据库
# ============================================
echo "[5/6] 检查数据库..."

if docker exec zimage-server test -f /app/data/zimage.db; then
    db_size=$(docker exec zimage-server stat -c%s /app/data/zimage.db 2>/dev/null || echo "0")
    echo "  ✓ 数据库存在 (大小: $((db_size / 1024))KB)"
else
    echo -e "${YELLOW}  ⚠ 数据库文件不存在${NC}"
fi

# ============================================
# 6. 检查存储
# ============================================
echo "[6/6] 检查存储..."

storage_count=$(docker exec zimage-server find /app/storage -type f 2>/dev/null | wc -l)
echo "  ✓ 存储目录存在 (文件数: $storage_count)"

# ============================================
# 资源使用
# ============================================
echo ""
echo "资源使用:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep -E "NAME|zimage" || true

# ============================================
# 总结
# ============================================
echo ""
if [ "$all_running" = true ]; then
    echo -e "${GREEN}✓ 所有服务正常运行${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分服务异常，请检查日志${NC}"
    echo ""
    echo "查看日志:"
    echo "  docker-compose logs -f"
    exit 1
fi
