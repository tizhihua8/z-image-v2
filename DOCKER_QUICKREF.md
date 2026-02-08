# 🐳 Z-Image v3 Docker 快速参考卡

## ⚡ 快速命令

```bash
# 一键部署
./deploy-docker.sh

# 或 Windows
deploy-docker.bat

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

## 📁 新增文件

| 文件 | 说明 |
|------|------|
| `.env.docker.example` | 环境变量模板 |
| `docker-compose.yml` | 主服务编排 |
| `docker-compose.worker.yml` | Worker 编排 |
| `deploy-docker.sh` | Linux/macOS 一键部署 |
| `deploy-docker.bat` | Windows 一键部署 |
| `web/Dockerfile` | 前端容器镜像 |
| `server/Dockerfile` | 后端容器镜像 |
| `worker/Dockerfile` | Worker 容器镜像 |
| `docs/DOCKER_DEPLOY.md` | 完整部署文档 |
| `scripts/backup-docker.sh` | 数据备份脚本 |
| `scripts/health-check.sh` | 健康检查脚本 |
| `docs/GITHUB_MIGRATION.md` | GitHub 迁移指南 |

## 🔧 必须配置

在 `.env` 文件中修改：

```env
DOMAIN=your-domain.com
SECRET_KEY=生成的随机密钥
WORKER_API_KEY=生成的随机密钥
LINUX_DO_CLIENT_ID=从 Linux DO 获取
LINUX_DO_CLIENT_SECRET=从 Linux DO 获取
```

## 🌐 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 | http://localhost:8000 |
| 后台 | http://localhost:3000/admin |

## 📝 故障排查

```bash
# 查看容器日志
docker-compose logs -f [service]

# 进入容器
docker exec -it zimage-server bash

# 健康检查
./scripts/health-check.sh
```

## 🔄 GitHub 迁移

详见 [GitHub 迁移指南](./docs/GITHUB_MIGRATION.md)

```bash
# 创建新仓库并推送
gh repo create z-image-v3 --public --source=. --remote=origin
git push -u origin --all
```
