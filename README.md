# RyanVan Z-Image

[![Build and Push Docker Images](https://github.com/tizhihua8/z-image-v3/actions/workflows/docker-build.yml/badge.svg)](https://github.com/tizhihua8/z-image-v3/actions/workflows/docker-build.yml)
[![Docker Hub](https://img.shields.io/badge/docker-tizhihua%2Fz--image-blue)](https://hub.docker.com/r/tizhihua/z-image)

基于 Z-Image-Turbo 模型的在线 AI 图像生成服务。

## 🌐 在线地址

- **网站**: https://ryanai.org
- **登录方式**: Linux DO Connect OAuth

## 📦 部署方式

### 🐳 单容器部署（推荐）

一个容器包含前端 + 后端 + Nginx，最简单的部署方式。

```bash
# 1. 克隆仓库
git clone https://github.com/tizhihua8/z-image-v3.git
cd z-image-v3

# 2. 一键部署（Linux/macOS）
chmod +x deploy-single.sh
./deploy-single.sh

# Windows 用户双击
# deploy-single.bat
```

**Docker Hub 镜像：**
```bash
docker pull tizhihua/z-image:latest
docker run -d -p 80:80 --name zimage \
  -e SECRET_KEY=your-key \
  -e LINUX_DO_CLIENT_ID=your-id \
  -e LINUX_DO_CLIENT_SECRET=your-secret \
  tizhihua/z-image:latest
```

**使用 Docker Compose：**
```bash
# 1. 下载配置文件
curl -O https://raw.githubusercontent.com/tizhihua8/z-image-v3/main/docker-compose.single.yml
curl -O https://raw.githubusercontent.com/tizhihua8/z-image-v3/main/.env.docker.example

# 2. 配置环境变量
cp .env.docker.example .env
nano .env  # 修改必填项

# 3. 启动服务
docker compose -f docker-compose.single.yml up -d
```

详细文档: [Docker 部署指南](./docs/DOCKER_DEPLOY.md)

### 传统部署

完整的 VPS + Worker 部署教程。

详细文档: [完整部署教程](./DEPLOY.md)

## 📁 项目结构

```
Z-Image-v3/
├── web/                       # Next.js 前端
├── server/                    # FastAPI 后端
├── worker/                    # 本地 GPU Worker
├── deploy/                    # 部署配置
│   ├── nginx-single.conf     # Nginx 单容器配置
│   └── supervisord.conf      # Supervisor 进程管理配置
├── docs/                      # 文档
│   ├── DOCKER_DEPLOY.md      # Docker 部署指南
│   └── LINUX_DO_CONNECT.md   # OAuth 接入文档
├── docker-compose.single.yml  # Docker 单容器编排配置
├── Dockerfile.single          # 单容器 Dockerfile
├── deploy-single.sh           # 一键部署脚本 (Linux/macOS)
├── deploy-single.bat          # 一键部署脚本 (Windows)
└── .env.docker.example        # 环境变量模板
```

## 🚀 快速开始

### 环境变量配置

复制 `.env.docker.example` 为 `.env` 并修改以下必填项：

```bash
# 基础配置
DOMAIN=your-domain.com
SECRET_KEY=your-random-secret-key

# Linux DO Connect OAuth
LINUX_DO_CLIENT_ID=your-client-id
LINUX_DO_CLIENT_SECRET=your-client-secret

# Worker API 密钥
WORKER_API_KEY=your-worker-api-key
```

### 本地开发

```bash
# 启动前端
cd web
npm install
npm run dev

# 启动后端
cd server
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# 启动 Worker（需要 GPU）
cd worker
pip install -r requirements.txt
python worker.py
```

### Worker 管理

```
双击：worker-manager.bat

========================================
      Z-Image Worker Manager
========================================

  1. Start Worker (启动)
  2. Stop Worker (停止)
  3. Check Status (状态)
  0. Exit (退出)
```

**注意：** 启动后需等待 15-20 秒加载模型

## 🔒 安全配置

- 所有敏感信息通过环境变量配置
- `.env` 文件已被 `.gitignore` 排除
- 生产环境建议配置防火墙规则

### 环境变量位置
- **Docker 部署**: 项目根目录 `.env` 文件
- **本地 Worker**: `worker/.env` 文件

## 📊 配额规则

| Trust Level | 每日配额 |
|-------------|---------|
| 0-1 级 | 1 张 |
| 2 级 | 5 张 |
| 3-4 级 | 20 张 |
| 管理员 | 1000 张 |

## 📝 开发备注

- 前端: Next.js 14 + TypeScript + Tailwind CSS
- 后端: FastAPI + SQLAlchemy + SQLite
- Worker: Python + Diffusers + CUDA
- 模型: Tongyi-MAI/Z-Image-Turbo
