# 🐳 Z-Image v3 Docker 容器化部署指南

> 🚀 5分钟完成部署，支持一键安装

## 📋 目录

- [快速开始](#快速开始) - 最简部署流程
- [前置要求](#前置要求) - 环境准备
- [完整部署](#完整部署) - 详细配置说明
- [Worker 部署](#worker-部署) - GPU 节点配置
- [生产环境](#生产环境) - SSL、域名、优化
- [故障排查](#故障排查) - 常见问题解决
- [管理命令](#管理命令) - 日常运维

---

## 🚀 快速开始

### 5分钟快速部署

```bash
# 1. 克隆仓库
git clone https://github.com/tizhihua8/z-image-v3.git
cd z-image-v3

# 2. 一键部署
chmod +x deploy-docker.sh
./deploy-docker.sh

# 3. 按提示完成配置
# - 输入域名
# - 输入 Linux DO OAuth 凭据
# - 等待构建完成

# 4. 访问服务
# 前端: http://localhost:3000
# 后端: http://localhost:8000
```

### Windows 用户

双击运行 `deploy-docker.bat` 即可

---

## 📦 前置要求

### 必需软件

| 软件 | 版本要求 | 检查命令 | 下载地址 |
|------|----------|----------|----------|
| Docker | 20.10+ | `docker --version` | [docker.com](https://www.docker.com/get-docker) |
| Docker Compose | 2.0+ | `docker compose version` | 随 Docker 安装 |
| Git | 任意 | `git --version` | [git-scm.com](https://git-scm.com) |

### GPU Worker 额外要求

| 软件 | 用途 | 下载地址 |
|------|------|----------|
| NVIDIA 驱动 | CUDA 支持 | [nvidia.com](https://www.nvidia.com/Download/index.aspx) |
| NVIDIA Container Toolkit | 容器 GPU 支持 | [安装指南](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) |

### 验证安装

```bash
# Docker
docker --version
# Docker Compose
docker compose version

# GPU (可选)
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.1-base-ubuntu22.04 nvidia-smi
```

---

## 🔧 完整部署

### 步骤 1: 准备配置文件

```bash
# 复制环境变量模板
cp .env.docker.example .env

# 编辑配置文件
nano .env  # 或使用任何文本编辑器
```

### 步骤 2: 必须修改的配置项

在 `.env` 文件中，以下配置项**必须**修改：

```env
# ============================================
# 必须修改的配置
# ============================================

# 部署域名（必填）
DOMAIN=your-domain.com

# JWT 密钥（必填，使用以下命令生成）
# 生成命令: openssl rand -hex 32
SECRET_KEY=change-me-to-random-secret-key

# Worker API 密钥（必填）
WORKER_API_KEY=change-me-to-random-worker-key

# Linux DO OAuth（必填）
LINUX_DO_CLIENT_ID=your-client-id
LINUX_DO_CLIENT_SECRET=your-client-secret
```

### 生成密钥

```bash
# Linux/macOS
openssl rand -hex 32

# 或使用 Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Windows (PowerShell)
python -c "import secrets; print(secrets.token_hex(32))"
```

### 步骤 3: 获取 Linux DO OAuth 凭据

1. 访问 [https://connect.linux.do](https://connect.linux.do)
2. 登录后点击"创建应用"
3. 填写信息：
   - 应用名称: `Z-Image`
   - 应用描述: `AI 生图服务`
   - 回调地址: `https://你的域名/api/auth/callback`
4. 保存显示的 `Client ID` 和 `Client Secret`

### 步骤 4: 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看启动状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 步骤 5: 验证部署

```bash
# 检查后端健康状态
curl http://localhost:8000/health
# 应返回: {"status":"healthy"}

# 检查前端
curl http://localhost:3000
# 应返回 HTML 内容
```

在浏览器访问：
- 前端: `http://localhost:3000`
- 后台: `http://localhost:3000/admin`

---

## 🎨 Worker 部署

Worker 是执行 AI 生图的组件，需要 GPU 支持。

### 方法 1: Docker 容器部署

```bash
# 1. 配置 Worker 环境变量
# 在 .env 中添加或修改:
WORKER_ID=worker-docker-gpu
WORKER_NAME=Docker GPU Worker
SERVER_URL=https://your-domain.com
WORKER_API_KEY=与服务器相同的WORKER_API_KEY

# 2. 启动 Worker
docker-compose -f docker-compose.worker.yml up -d

# 3. 查看 Worker 日志
docker-compose -f docker-compose.worker.yml logs -f worker
```

### 方法 2: 本地 Python 部署

详见 [部署文档](./DEPLOY.md) 的 Worker 部分

### GPU 验证

```bash
# 检查 GPU 是否可用
docker exec zimage-worker nvidia-smi

# 查看 Worker 模型加载状态
docker logs zimage-worker | grep "Model"
```

---

## 🏭 生产环境

### SSL/TLS 配置

#### 方案 A: 使用 Traefik（推荐）

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=your-email@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "letsencrypt:/letsencrypt"
    networks:
      - zimage-network

  # 在其他服务中添加标签
  web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(\`your-domain.com\`)"
      - "traefik.http.routers.web.tls=true"
      - "traefik.http.routers.web.tls.certresolver=myresolver"
```

#### 方案 B: 使用 Nginx

```yaml
# docker-compose.yml 添加 nginx 服务
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./deploy/nginx-docker.conf:/etc/nginx/conf.d/default.conf:ro
    - ./deploy/ssl:/etc/nginx/ssl:ro
  depends_on:
    - web
    - server
```

### 性能优化

#### 资源限制

```yaml
# docker-compose.yml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  web:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

#### 数据库优化

对于高并发场景，建议切换到 PostgreSQL：

```env
# .env
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/zimage

# docker-compose.yml 添加:
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: zimage
      POSTGRES_PASSWORD: your-password
      POSTGRES_DB: zimage
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

### 数据持久化

```yaml
volumes:
  zimage-db:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/z-image/data

  zimage-storage:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/z-image/storage
```

### 备份策略

创建自动备份脚本 `scripts/backup.sh`:

```bash
#!/bin/bash
# 备份数据库
docker exec zimage-server sqlite3 /app/data/zimage.db ".backup '/backup/zimage.db'"

# 备份存储
docker run --rm -v zimage-storage:/data -v ./backup:/backup alpine \
  tar czf /backup/storage-$(date +%Y%m%d).tar.gz -C /data .

# 保留最近 7 天的备份
find ./backup -name "zimage.db.*" -mtime +7 -delete
```

添加到 crontab:

```bash
# 每天凌晨 3 点备份
0 3 * * * /path/to/backup.sh
```

---

## 🔧 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs -f [service-name]

# 常见问题
1. 端口冲突 → 修改 .env 中的端口配置
2. 权限问题 → 检查挂载目录权限
3. 内存不足 → 减少资源限制或增加系统内存
```

### 健康检查失败

```bash
# 手动执行健康检查
docker exec zimage-server curl http://localhost:8000/health

# 进入容器调试
docker exec -it zimage-server bash
```

### Worker 连接失败

检查清单：

- [ ] `WORKER_API_KEY` 与服务端 `.env` 一致
- [ ] `SERVER_URL` 正确（包含 `https://`）
- [ ] 网络可达性（从 Worker 机器 ping 服务器）
- [ ] 防火墙规则允许 443 端口
- [ ] NVIDIA 驱动版本兼容

### 数据库问题

```bash
# 重建数据库（⚠️ 会清空所有数据）
docker-compose down -v
docker-compose up -d

# 迁移到 PostgreSQL
# 参考 "生产环境" 部分的数据库配置
```

### 磁盘空间不足

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的卷
docker volume prune

# 查看空间占用
docker system df
```

---

## 📊 管理命令

### 日常操作

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
docker-compose logs -f server
docker-compose logs -f web

# 进入容器
docker exec -it zimage-server bash
docker exec -it zimage-web sh

# 更新服务
git pull
docker-compose build
docker-compose up -d
```

### 监控

```bash
# 实时资源监控
docker stats

# 查看容器详细信息
docker inspect zimage-server

# 健康状态
docker inspect --format='{{.State.Health.Status}}' zimage-server
```

### 数据管理

```bash
# 备份数据库
docker exec zimage-server sqlite3 /app/data/zimage.db ".backup '/tmp/backup.db'"
docker cp zimage-server:/tmp/backup.db ./backup-$(date +%Y%m%d).db

# 备份存储
docker cp zimage-server:/app/storage ./storage-backup

# 恢复数据库
docker cp ./backup.db zimage-server:/tmp/restore.db
docker exec zimage-server sqlite3 /app/data/zimage.db ".restore '/tmp/restore.db'"
```

---

## 🏗️ 架构说明

### 容器架构

```
┌─────────────────────────────────────────────┐
│                  Docker Host                 │
├─────────────────────────────────────────────┤
│  ┌──────────┐    ┌──────────┐    ┌───────┐ │
│  │  Nginx   │───▶│   Web    │    │ Server│ │
│  │  :80/:443│    │  :3000   │    │ :8000 │ │
│  └──────────┘    └──────────┘    └───────┘ │
│       │                                   │
│       └───────────────────────────────────┤
│                    ▲                       │
└────────────────────┼───────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────┴─────┐             ┌────┴─────┐
   │ Worker 1 │             │ Worker 2 │
   │  (GPU)   │             │  (GPU)   │
   └──────────┘             └──────────┘
```

### 网络架构

```
zimage-network (bridge)
    │
    ├── zimage-web (frontend)
    ├── zimage-server (backend)
    └── zimage-nginx (reverse proxy, optional)
```

### 数据流

1. 用户 → Nginx → Web 前端
2. 用户请求 → Nginx → Server 后端
3. Server → Worker (通过 HTTPS)
4. Worker 生成图片 → 上传到 Server
5. Server 存储到本地卷
6. Web 通过 Server API 获取图片

---

## 📚 更多资源

- [传统部署文档](./DEPLOY.md) - 非 Docker 部署方式
- [架构设计文档](./docs/architecture.md) - 系统设计说明
- [API 文档](./docs/api.md) - API 接口说明
- [GitHub Issues](https://github.com/tizhihua8/z-image-v3/issues) - 问题反馈

---

## 🆘 获取帮助

遇到问题？

1. 查看本文档的"故障排查"部分
2. 检查容器日志定位问题
3. 在 [Linux DO 论坛](https://linux.do) 发帖求助
4. 提交 [GitHub Issue](https://github.com/tizhihua8/z-image-v3/issues)

祝你部署顺利！🎉
