#!/bin/bash
# ============================================
# Z-Image v3 单容器一键部署脚本
# ============================================
# 一个容器包含前端+后端+Nginx

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\'\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  Z-Image v3 单容器部署"
    echo "  前端 + 后端 + Nginx 合二为一"
    echo "========================================"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 检查依赖
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: 未安装 Docker${NC}"
        echo "请访问 https://docs.docker.com/get-docker/ 安装"
        exit 1
    fi

    DOCKER_COMPOSE_CMD="docker-compose"
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    fi

    print_step "Docker 版本: $(docker --version)"
    print_step "Docker Compose 版本: $($DOCKER_COMPOSE_CMD version --short 2>/dev/null || echo 'N/A')"
}

# 配置环境变量
configure_env() {
    print_step "配置环境变量..."

    if [[ -f ".env" ]]; then
        read -p "检测到现有 .env 文件，是否重新配置? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_step "使用现有配置"
            return
        fi
    fi

    if [[ ! -f ".env.docker.example" ]]; then
        echo -e "${RED}错误: 找不到 .env.docker.example${NC}"
        exit 1
    fi

    cp .env.docker.example .env

    # 生成密钥
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    WORKER_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

    # 交互式配置
    read -p "请输入域名 (例如: zimage.example.com): " DOMAIN
    read -p "请输入 Client ID: " CLIENT_ID
    read -sp "请输入 Client Secret: " CLIENT_SECRET
    echo

    # 更新配置
    sed -i.bak "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env
    sed -i.bak "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    sed -i.bak "s/WORKER_API_KEY=.*/WORKER_API_KEY=$WORKER_KEY/" .env
    sed -i.bak "s|LINUX_DO_REDIRECT_URI=.*|LINUX_DO_REDIRECT_URI=https://$DOMAIN/api/auth/callback|" .env
    sed -i.bak "s/LINUX_DO_CLIENT_ID=.*/LINUX_DO_CLIENT_ID=$CLIENT_ID/" .env
    sed -i.bak "s/LINUX_DO_CLIENT_SECRET=.*/LINUX_DO_CLIENT_SECRET=$CLIENT_SECRET/" .env

    rm -f .env.bak
    print_step "配置完成"
}

# 构建镜像
build_image() {
    print_step "构建单容器镜像（首次运行需要几分钟）..."
    $DOCKER_COMPOSE_CMD -f docker-compose.single.yml build
}

# 启动服务
start_service() {
    print_step "启动服务..."
    $DOCKER_COMPOSE_CMD -f docker-compose.single.yml up -d
}

# 健康检查
health_check() {
    print_step "等待服务启动..."
    sleep 15

    local port=${APP_PORT:-80}
    if curl -sf http://localhost:$port/health > /dev/null; then
        print_step "✓ 服务运行正常"
    else
        echo -e "${YELLOW}⚠ 服务可能仍在启动中，请稍后检查${NC}"
    fi
}

# 显示信息
show_info() {
    local port=${APP_PORT:-80}
    echo ""
    echo -e "${GREEN}========================================"
    echo "  部署完成!"
    echo "========================================${NC}"
    echo ""
    echo "访问地址: http://localhost:$port"
    echo ""
    echo "管理命令:"
    echo "  查看日志: $DOCKER_COMPOSE_CMD -f docker-compose.single.yml logs -f"
    echo "  停止服务: $DOCKER_COMPOSE_CMD -f docker-compose.single.yml down"
    echo "  重启服务: $DOCKER_COMPOSE_CMD -f docker-compose.single.yml restart"
    echo ""
}

main() {
    print_banner

    check_docker
    configure_env
    build_image
    start_service
    health_check
    show_info
}

main "$@"
