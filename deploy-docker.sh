#!/bin/bash
# ============================================
# Z-Image v3 一键部署脚本
# ============================================
# 支持 Linux/macOS/WSL2
# 使用方法:
#   ./deploy-docker.sh [选项]
#
# 选项:
#   --mode MODE      部署模式: all/server/worker (默认: all)
#   --domain DOMAIN  设置域名
#   --auto           非交互式自动部署
#   --skip-ssl       跳过 SSL 证书申请
#   --help           显示帮助信息

set -e

# ============================================
# 配置变量
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="all"
DOMAIN=""
AUTO_MODE=false
SKIP_SSL=false
DOCKER_COMPOSE_CMD="docker-compose"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 辅助函数
# ============================================

print_banner() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  Z-Image v3 容器化部署工具"
    echo "========================================"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 未安装，请先安装"
        return 1
    fi
    return 0
}

# ============================================
# 参数解析
# ============================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mode)
                MODE="$2"
                shift 2
                ;;
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --auto)
                AUTO_MODE=true
                shift
                ;;
            --skip-ssl)
                SKIP_SSL=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
用法: $0 [选项]

选项:
  --mode MODE      部署模式: all/server/worker (默认: all)
  --domain DOMAIN  设置域名
  --auto           非交互式自动部署
  --skip-ssl       跳过 SSL 证书申请
  --help           显示帮助信息

示例:
  # 交互式部署所有服务
  $0

  # 自动部署服务器（指定域名）
  $0 --mode server --domain example.com --auto

  # 仅部署 Worker
  $0 --mode worker

EOF
}

# ============================================
# 环境检测
# ============================================

detect_environment() {
    print_step "检测运行环境..."

    # 检测 Docker
    if ! check_command docker; then
        print_error "请先安装 Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # 检测 Docker Compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif check_command docker-compose; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        print_error "请先安装 Docker Compose"
        exit 1
    fi

    print_step "Docker 版本: $(docker --version)"
    print_step "Docker Compose 版本: $($DOCKER_COMPOSE_CMD version --short 2>/dev/null || echo 'N/A')"

    # 检测 GPU (Worker 模式)
    if [[ "$MODE" == "worker" ]] || [[ "$MODE" == "all" ]]; then
        if command -v nvidia-smi &> /dev/null; then
            print_step "检测到 NVIDIA GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)"
        else
            print_warn "未检测到 NVIDIA GPU，Worker 将使用 CPU 模式"
        fi
    fi
}

# ============================================
# 配置向导
# ============================================

configure_env() {
    print_step "配置环境变量..."

    local env_file="$SCRIPT_DIR/.env"
    local env_example="$SCRIPT_DIR/.env.docker.example"

    # 检查是否已存在配置
    if [[ -f "$env_file" ]]; then
        if [[ "$AUTO_MODE" == false ]]; then
            read -p "检测到现有 .env 文件，是否重新配置? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_step "使用现有配置"
                return
            fi
            rm "$env_file"
        else
            print_step "使用现有配置"
            return
        fi
    fi

    # 复制模板
    if [[ ! -f "$env_example" ]]; then
        print_error "找不到 .env.docker.example 模板文件"
        exit 1
    fi

    cp "$env_example" "$env_file"

    # 生成随机密钥
    if [[ "$AUTO_MODE" == false ]]; then
        # 交互式配置
        [[ -z "$DOMAIN" ]] && read -p "请输入域名 (例如: zimage.example.com): " DOMAIN

        # 生成密钥
        SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
        WORKER_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

        echo ""
        print_step "请输入 Linux DO OAuth 配置:"
        read -p "Client ID: " CLIENT_ID
        read -sp "Client Secret: " CLIENT_SECRET
        echo ""

        # 更新配置文件
        sed -i.bak "s/DOMAIN=.*/DOMAIN=$DOMAIN/" "$env_file"
        sed -i.bak "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" "$env_file"
        sed -i.bak "s/WORKER_API_KEY=.*/WORKER_API_KEY=$WORKER_KEY/" "$env_file"
        sed -i.bak "s|LINUX_DO_REDIRECT_URI=.*|LINUX_DO_REDIRECT_URI=https://$DOMAIN/api/auth/callback|" "$env_file"
        sed -i.bak "s/LINUX_DO_CLIENT_ID=.*/LINUX_DO_CLIENT_ID=$CLIENT_ID/" "$env_file"
        sed -i.bak "s/LINUX_DO_CLIENT_SECRET=.*/LINUX_DO_CLIENT_SECRET=$CLIENT_SECRET/" "$env_file"

        rm -f "$env_file.bak"
    else
        # 自动模式 - 使用默认值
        [[ -z "$DOMAIN" ]] && DOMAIN="localhost"
        print_warn "自动模式：使用默认密钥（请手动修改 .env 文件）"
    fi

    print_step "配置文件已创建: $env_file"
}

# ============================================
# 构建镜像
# ============================================

build_images() {
    print_step "构建 Docker 镜像..."

    case $MODE in
        all|server)
            print_step "构建服务器镜像..."
            $DOCKER_COMPOSE_CMD build server web
            ;;
        worker)
            print_step "构建 Worker 镜像..."
            $DOCKER_COMPOSE_CMD -f docker-compose.worker.yml build
            ;;
    esac
}

# ============================================
# 启动服务
# ============================================

start_services() {
    print_step "启动服务..."

    case $MODE in
        all|server)
            $DOCKER_COMPOSE_CMD up -d server web
            print_step "服务器已启动"
            ;;
        worker)
            # 检查 GPU
            if docker run --rm --gpus all nvidia/cuda:12.1-base-ubuntu22.04 nvidia-smi &> /dev/null; then
                $DOCKER_COMPOSE_CMD -f docker-compose.worker.yml up -d
                print_step "Worker 已启动 (GPU 模式)"
            else
                print_warn "GPU 不可用，尝试 CPU 模式..."
                $DOCKER_COMPOSE_CMD -f docker-compose.worker.yml up -d
                print_step "Worker 已启动 (CPU 模式)"
            fi
            ;;
    esac
}

# ============================================
# 健康检查
# ============================================

health_check() {
    print_step "等待服务启动..."
    sleep 10

    case $MODE in
        all|server)
            # 检查后端
            if curl -sf http://localhost:${BACKEND_PORT:-8000}/health > /dev/null; then
                print_step "✓ 后端服务正常"
            else
                print_error "✗ 后端服务异常"
            fi

            # 检查前端
            if curl -sf http://localhost:${FRONTEND_PORT:-3000} > /dev/null; then
                print_step "✓ 前端服务正常"
            else
                print_error "✗ 前端服务异常"
            fi
            ;;
        worker)
            print_step "Worker 日志:"
            $DOCKER_COMPOSE_CMD -f docker-compose.worker.yml logs --tail=20 worker
            ;;
    esac
}

# ============================================
# 显示部署信息
# ============================================

show_info() {
    echo ""
    echo -e "${GREEN}========================================"
    echo "  部署完成!"
    echo "========================================${NC}"
    echo ""
    echo "服务状态:"
    echo "  查看: $DOCKER_COMPOSE_CMD ps"
    echo ""
    echo "查看日志:"
    echo "  所有: $DOCKER_COMPOSE_CMD logs -f"
    echo "  后端: $DOCKER_COMPOSE_CMD logs -f server"
    echo "  前端: $DOCKER_COMPOSE_CMD logs -f web"
    echo ""
    echo "停止服务:"
    echo "  $DOCKER_COMPOSE_CMD down"
    echo ""
    echo "重启服务:"
    echo "  $DOCKER_COMPOSE_CMD restart"
    echo ""

    if [[ "$MODE" == "all" ]] || [[ "$MODE" == "server" ]]; then
        if [[ "$DOMAIN" != "localhost" ]]; then
            echo "访问地址:"
            echo "  前端: https://$DOMAIN"
            echo "  后端: https://$DOMAIN/api"
            echo "  后台: https://$DOMAIN/admin"
        else
            echo "访问地址:"
            echo "  前端: http://localhost:${FRONTEND_PORT:-3000}"
            echo "  后端: http://localhost:${BACKEND_PORT:-8000}"
        fi
    fi
    echo ""
}

# ============================================
# 主流程
# ============================================

main() {
    print_banner

    # 解析参数
    parse_args "$@"

    # 环境检测
    detect_environment

    # 配置环境
    configure_env

    # 构建镜像
    build_images

    # 启动服务
    start_services

    # 健康检查
    health_check

    # 显示信息
    show_info
}

# 运行主流程
main "$@"
