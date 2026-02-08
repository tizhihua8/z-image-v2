# RyanVan Z-Image

[![Build and Push Docker Images](https://github.com/tizhihua8/z-image-v3/actions/workflows/docker-build.yml/badge.svg)](https://github.com/tizhihua8/z-image-v3/actions/workflows/docker-build.yml)
[![Docker Hub](https://img.shields.io/badge/docker-tizhihua8%2Fz--image-blue)](https://hub.docker.com/u/tizhihua8)

基于 Z-Image-Turbo 模型的在线 AI 图像生成服务。

## 🌐 在线地址

- **网站**: https://ryanai.org
- **登录方式**: Linux DO Connect OAuth

## 📦 部署方式

### 🐳 Docker Hub 镜像部署（最快，推荐）

使用预构建镜像，无需等待编译：

```bash
# 1. 下载配置文件
curl -O https://raw.githubusercontent.com/tizhihua8/z-image-v3/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/tizhihua8/z-image-v3/main/.env.docker.example

# 2. 配置环境变量
cp .env.docker.example .env
nano .env  # 修改必填项

# 3. 启动服务
docker-compose up -d
```

**可用镜像：**
- `tizhihua8/z-image-server:latest` - 后端服务
- `tizhihua8/z-image-web:latest` - 前端服务
- `tizhihua8/z-image-worker:latest` - GPU Worker

### 🐳 Docker 本地构建

```bash
# 一键部署
git clone https://github.com/tizhihua8/z-image-v3.git
cd z-image-v3
./deploy-docker.sh
```

详细文档: [Docker 部署指南](./docs/DOCKER_DEPLOY.md)

### 传统部署

完整的 VPS + Worker 部署教程。

详细文档: [完整部署教程](./DEPLOY.md)

## 📁 项目结构

```
Z-Image-v3/
├── web/                    # Next.js 前端
├── server/                 # FastAPI 后端
├── worker/                 # 本地 GPU Worker
├── docs/                   # 文档
│   ├── DOCKER_DEPLOY.md    # Docker 部署指南
│   └── LINUX_DO_CONNECT.md # OAuth 接入文档
├── docker-compose.yml      # Docker 编排配置
├── deploy-docker.sh        # 一键部署脚本 (Linux/macOS)
├── deploy-docker.bat       # 一键部署脚本 (Windows)
└── .env.docker.example     # 环境变量模板
```

## 🚀 快速开始

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

## 🔧 部署前端更新

### 快速部署（日常更新，约 1MB）
```
双击：deploy-fast.bat
```

### 完整部署（首次或大改动，约 15MB）
```
双击：deploy-web.bat
```

## 📊 配额规则

| Trust Level | 每日配额 |
|-------------|---------|
| 0-1 级 | 1 张 |
| 2 级 | 5 张 |
| 3-4 级 | 20 张 |
| 管理员 | 1000 张 |

## 🔒 安全配置

- 所有敏感信息通过环境变量配置
- `.env` 文件已被 `.gitignore` 排除
- VPS 已配置拒绝 IP 直接访问

### 环境变量位置
- **VPS 后端**: `/var/www/zimage/server/.env`
- **本地 Worker**: `D:\Z-Image\worker\.env`

## 🖥️ 部署信息

- **前端端口**: 3001 (或自定义)
- **后端端口**: 8001 (或自定义)

## 📝 开发备注

- 前端: Next.js 14 + TypeScript + Tailwind CSS
- 后端: FastAPI + SQLAlchemy + SQLite
- Worker: Python + Diffusers + CUDA
- 模型: Tongyi-MAI/Z-Image-Turbo
