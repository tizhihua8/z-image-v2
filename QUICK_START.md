# 🚀 Z-Image v3 一键部署指南

## 5分钟快速部署

### 方式一：使用 Docker Hub 镜像（推荐，最快）

```bash
# 1. 创建项目目录
mkdir z-image && cd z-image

# 2. 下载 docker-compose 配置
curl -O https://raw.githubusercontent.com/tizhihua8/z-image-v3/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/tizhihua8/z-image-v3/main/.env.docker.example

# 3. 复制环境变量模板
cp .env.docker.example .env

# 4. 编辑 .env 文件，填写必填项
nano .env  # 或使用其他编辑器
```

**必须修改的配置项：**
```env
DOMAIN=your-domain.com
SECRET_KEY=生成的随机密钥
WORKER_API_KEY=生成的随机密钥
LINUX_DO_CLIENT_ID=从Linux DO获取
LINUX_DO_CLIENT_SECRET=从Linux DO获取
```

```bash
# 5. 启动服务
docker-compose up -d

# 完成！访问 http://localhost:3000
```

---

### 方式二：克隆仓库完整部署

```bash
# 1. 克隆仓库
git clone https://github.com/tizhihua8/z-image-v3.git
cd z-image-v3

# 2. 一键部署（Linux/macOS）
chmod +x deploy-docker.sh
./deploy-docker.sh

# Windows 用户双击运行
# deploy-docker.bat
```

---

## 镜像说明

| 镜像 | 描述 | Docker Hub |
|------|------|-----------|
| z-image-server | FastAPI 后端服务 | [docker.io](https://hub.docker.com/r/tizhihua8/z-image-server) |
| z-image-web | Next.js 前端服务 | [docker.io](https://hub.docker.com/r/tizhihua8/z-image-web) |
| z-image-worker | GPU Worker 服务 | [docker.io](https://hub.docker.com/r/tizhihua8/z-image-worker) |

---

## 获取帮助

- [完整部署文档](./DOCKER_DEPLOY.md)
- [GitHub Issues](https://github.com/tizhihua8/z-image-v3/issues)
- [Linux DO 论坛](https://linux.do)
