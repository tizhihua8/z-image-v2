#!/bin/bash
# ============================================
# Z-Image v3 数据备份脚本 (Docker)
# ============================================
# 用途: 备份 Docker 部署的数据
# 使用: ./scripts/backup-docker.sh

set -e

# 配置
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================"
echo "  Z-Image 数据备份"
echo "========================================${NC}"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# ============================================
# 1. 备份数据库
# ============================================
echo "[1/3] 备份数据库..."

docker exec zimage-server sqlite3 /app/data/zimage.db ".backup '/tmp/zimage_backup.db'" 2>/dev/null || true

if docker cp zimage-server:/tmp/zimage_backup.db "$BACKUP_DIR/zimage_db_$DATE.db" 2>/dev/null; then
    echo "  ✓ 数据库备份完成: zimage_db_$DATE.db"
else
    echo -e "${YELLOW}  ⚠ 数据库备份失败（可能容器未运行）${NC}"
fi

# ============================================
# 2. 备份存储文件
# ============================================
echo "[2/3] 备份存储文件..."

docker run --rm \
    -v zimage-storage:/data:ro \
    -v "$(pwd)/$BACKUP_DIR":/backup \
    alpine tar czf "/backup/zimage_storage_$DATE.tar.gz" -C /data . 2>/dev/null || true

if [ -f "$BACKUP_DIR/zimage_storage_$DATE.tar.gz" ]; then
    echo "  ✓ 存储备份完成: zimage_storage_$DATE.tar.gz"
else
    echo -e "${YELLOW}  ⚠ 存储备份失败（可能卷不存在）${NC}"
fi

# ============================================
# 3. 备份环境配置
# ============================================
echo "[3/3] 备份环境配置..."

if [ -f ".env" ]; then
    # 过滤敏感信息（可选）
    cp .env "$BACKUP_DIR/env_$DATE.bak"
    echo "  ✓ 配置备份完成: env_$DATE.bak"
else
    echo -e "${YELLOW}  ⚠ 未找到 .env 文件${NC}"
fi

# ============================================
# 4. 清理旧备份
# ============================================
echo ""
echo "清理 $RETENTION_DAYS 天前的旧备份..."

find "$BACKUP_DIR" -name "zimage_*.db" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "zimage_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env_*.bak" -mtime +$RETENTION_DAYS -delete

echo "  ✓ 清理完成"

# ============================================
# 完成
# ============================================
echo ""
echo -e "${GREEN}备份完成！${NC}"
echo ""
echo "备份位置: $BACKUP_DIR"
echo "最新备份:"
ls -lht "$BACKUP_DIR" | head -5

# 显示磁盘使用
echo ""
echo "磁盘使用:"
du -sh "$BACKUP_DIR"
