# Z-Image 完整部署教程

> 🎯 本教程面向新手，手把手教你从零部署一套完整的 AI 生图系统

## 目录

- [系统介绍](#系统介绍)
- [准备工作](#准备工作)
- [第一部分：VPS 服务器部署](#第一部分vps-服务器部署)
- [第二部分：Worker 部署](#第二部分worker-部署gpu-电脑)
- [第三部分：Linux DO OAuth 配置](#第三部分linux-do-oauth-配置)
- [第四部分：验证与测试](#第四部分验证与测试)
- [日常运维](#日常运维)
- [常见问题](#常见问题)

---

## 系统介绍

### 这是什么？

Z-Image 是一套**分布式 AI 生图系统**，由三部分组成：

```
┌─────────────────────────────────────────────────────────────────┐
│                        VPS 云服务器                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Nginx   │───▶│ Next.js  │    │ FastAPI  │◀──▶│  SQLite  │  │
│  │  反向代理 │    │   前端   │    │   后端   │    │  数据库  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │                                ▲                        │
│       │          用户通过浏览器访问     │ Worker 通过 API 通信    │
└───────┼────────────────────────────────┼────────────────────────┘
        ▼                                │
   ┌─────────┐                           │
   │  用户   │                           │
   │ 浏览器  │                           │
   └─────────┘                           │
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
        ┌─────┴─────┐             ┌──────┴──────┐            ┌──────┴──────┐
        │  Worker1  │             │   Worker2   │            │   Worker3   │
        │  你的电脑  │             │  朋友的电脑  │            │  云GPU服务器 │
        │ RTX 3080  │             │  RTX 4090   │            │   A100      │
        └───────────┘             └─────────────┘            └─────────────┘
              │                          │                          │
              └──────────────────────────┴──────────────────────────┘
                              实际执行 AI 生图
```

### 为什么这样设计？

| 组件 | 位置 | 作用 | 资源需求 |
|------|------|------|----------|
| **前端+后端** | VPS 云服务器 | 处理用户请求、管理任务队列 | 很低（1核1G够用） |
| **Worker** | 有 GPU 的电脑 | 运行 AI 模型生成图片 | 很高（需要显卡） |

**好处**：
- VPS 便宜（几十块/月），24 小时在线
- GPU 电脑不用一直开着，需要时启动 Worker 即可
- 可以添加多个 Worker 实现负载均衡

---

## 准备工作

### 你需要准备

#### 1. 一台 VPS 云服务器

**推荐配置**：
- 系统：Ubuntu 22.04 LTS
- CPU：1 核
- 内存：1 GB
- 硬盘：20 GB
- 带宽：按需（图片传输会消耗流量）

**推荐厂商**（价格参考）：
- [Vultr](https://vultr.com) - $5/月起
- [DigitalOcean](https://digitalocean.com) - $4/月起
- [Netcup](https://netcup.de) - €3/月起（德国，性价比高）
- 国内：腾讯云、阿里云轻量应用服务器

#### 2. 一个域名

- 从 [Namesilo](https://namesilo.com)、[Cloudflare](https://cloudflare.com) 等购买
- 将域名解析到你的 VPS IP 地址（A 记录）

#### 3. 一台有 NVIDIA GPU 的电脑

**最低要求**：
- GPU：8GB 显存（GTX 1080、RTX 2070 起步）
- 内存：16 GB
- 硬盘：50 GB 空闲空间（存放模型）

**推荐配置**：
- GPU：RTX 3080 10GB / RTX 4070 12GB 或更高
- 内存：32 GB
- 硬盘：SSD 100GB+

#### 4. 软件环境

**VPS 上**：
- SSH 客户端（Windows 用 [Termius](https://termius.com) 或 PowerShell）
- SFTP 客户端（推荐 [FileZilla](https://filezilla-project.org)）

**本地电脑**：
- Python 3.10+
- CUDA 12.1+（[NVIDIA 官网下载](https://developer.nvidia.com/cuda-downloads)）
- Node.js 18+（[官网下载](https://nodejs.org)）

---

## 第一部分：VPS 服务器部署

### 步骤 1：连接到 VPS

打开终端（Windows PowerShell 或 Mac Terminal）：

```bash
ssh root@你的服务器IP
```

首次连接会询问是否信任，输入 `yes`。

### 步骤 2：更新系统

```bash
# 更新软件包列表
apt update

# 升级已安装的软件
apt upgrade -y
```

### 步骤 3：安装必要软件

```bash
# 安装 Python、Nginx、Node.js、Certbot（SSL证书）、Git
apt install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx nodejs npm git

# 验证安装
python3 --version   # 应该显示 3.10+
node --version      # 应该显示 18+
nginx -v            # 应该显示版本号
```

### 步骤 4：安装 PM2

PM2 是 Node.js 进程管理器，用于运行前端：

```bash
npm install -g pm2
```

### 步骤 5：创建项目目录

```bash
# 创建目录结构
mkdir -p /var/www/zimage/{server,web}
cd /var/www/zimage
```

### 步骤 6：上传代码

在**本地电脑**打开终端，上传代码到服务器：

```bash
# 上传后端代码
scp -r 你的项目路径/server/* root@你的服务器IP:/var/www/zimage/server/

# 上传前端代码（先本地构建）
cd 你的项目路径/web
npm install
npm run build

# 上传构建产物
scp -r .next package.json package-lock.json next.config.mjs root@你的服务器IP:/var/www/zimage/web/
```

> 💡 **提示**：也可以使用 FileZilla 可视化上传文件

### 步骤 7：配置后端

回到服务器终端：

```bash
cd /var/www/zimage/server

# 创建 Python 虚拟环境
python3 -m venv .venv

# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 创建数据目录
mkdir -p data storage
```

#### 创建环境变量文件

```bash
nano .env
```

粘贴以下内容（按 `Ctrl+O` 保存，`Ctrl+X` 退出）：

```env
# ============================================
# 基础配置
# ============================================
DEBUG=false

# 生成随机密钥（在本地运行下面命令获取）
# python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=在这里粘贴生成的密钥

# ============================================
# Linux DO OAuth（第三部分会讲如何获取）
# ============================================
LINUX_DO_CLIENT_ID=你的ClientID
LINUX_DO_CLIENT_SECRET=你的ClientSecret
LINUX_DO_REDIRECT_URI=https://你的域名/api/auth/callback

# ============================================
# 前端地址
# ============================================
FRONTEND_URL=https://你的域名

# ============================================
# 管理员账号（用于后台管理）
# ============================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=设置一个强密码

# ============================================
# Worker 密钥（Worker 连接时需要）
# ============================================
# 同样用上面的命令生成一个新的
WORKER_API_KEY=生成另一个随机密钥

# ============================================
# 存储路径
# ============================================
STORAGE_ROOT=./storage
```

#### 创建 systemd 服务

```bash
# 创建服务文件
cat > /etc/systemd/system/zimage-api.service << 'EOF'
[Unit]
Description=Z-Image API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/zimage/server
Environment=PATH=/var/www/zimage/server/.venv/bin
ExecStart=/var/www/zimage/server/.venv/bin/python run.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
systemctl daemon-reload

# 启用开机自启
systemctl enable zimage-api

# 启动服务
systemctl start zimage-api

# 检查状态
systemctl status zimage-api
```

如果看到 `Active: active (running)` 表示启动成功。

### 步骤 8：配置前端

```bash
cd /var/www/zimage/web

# 只安装生产依赖
npm install --production

# 创建环境变量
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://你的域名
EOF

# 使用 PM2 启动（端口 3001）
pm2 start npm --name "zimage-web" -- start -- -p 3001

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
# 按提示执行输出的命令
```

### 步骤 9：配置 Nginx

```bash
# 创建站点配置
nano /etc/nginx/sites-available/zimage
```

粘贴以下内容（记得替换 `你的域名`）：

```nginx
# HTTP 跳转 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name 你的域名;
    return 301 https://$host$request_uri;
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name 你的域名;

    # SSL 证书（稍后由 Certbot 自动配置）
    ssl_certificate /etc/letsencrypt/live/你的域名/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/你的域名/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # 上传大小限制
    client_max_body_size 50M;

    # 前端（Next.js）
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # WebSocket（聊天室）
    location /api/chat/ws {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
    }
}
```

```bash
# 启用站点
ln -sf /etc/nginx/sites-available/zimage /etc/nginx/sites-enabled/

# 删除默认站点（可选）
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t
```

### 步骤 10：申请 SSL 证书

```bash
# 先临时启动 Nginx（无 SSL）
# 需要先注释掉配置文件中的 ssl_certificate 两行

# 申请证书
certbot --nginx -d 你的域名

# 按提示操作：
# 1. 输入邮箱
# 2. 同意条款（A）
# 3. 是否分享邮箱（N）
```

证书申请成功后，Certbot 会自动配置 Nginx。

```bash
# 重启 Nginx
systemctl restart nginx
```

### 步骤 11：验证部署

```bash
# 检查所有服务状态
systemctl status zimage-api   # 后端
pm2 status                     # 前端
systemctl status nginx         # Nginx

# 测试 API
curl http://127.0.0.1:8001/api/health
# 应该返回 {"status":"ok"}
```

在浏览器访问 `https://你的域名`，应该能看到网站首页。

---

## 第二部分：Worker 部署（GPU 电脑）

Worker 是实际执行 AI 生图的程序，运行在你有 GPU 的电脑上。

### 步骤 1：安装 Python

从 [Python 官网](https://www.python.org/downloads/) 下载 Python 3.10 或更高版本。

安装时勾选 **"Add Python to PATH"**。

验证安装：
```bash
python --version
# 应该显示 Python 3.10.x 或更高
```

### 步骤 2：安装 CUDA

1. 下载 [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads)（推荐 12.1+）
2. 安装时选择"自定义"，只需安装 CUDA 核心组件
3. 重启电脑

验证安装：
```bash
nvidia-smi
# 应该显示你的 GPU 信息和 CUDA 版本
```

### 步骤 3：准备 Worker 文件

将项目中的 `worker` 文件夹复制到你的电脑，例如 `D:\Z-Image\worker`

### 步骤 4：安装 PyTorch

打开命令提示符，进入 worker 目录：

```bash
cd D:\Z-Image\worker

# 创建虚拟环境（可选但推荐）
python -m venv venv
venv\Scripts\activate

# 安装 PyTorch（CUDA 12.1 版本）
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

> ⚠️ PyTorch 版本必须与你的 CUDA 版本匹配，访问 [PyTorch 官网](https://pytorch.org/get-started/locally/) 获取正确命令

### 步骤 5：安装其他依赖

```bash
# 安装 diffusers（从源码，支持最新模型）
pip install git+https://github.com/huggingface/diffusers

# 安装其他依赖
pip install transformers accelerate safetensors sentencepiece huggingface_hub Pillow httpx python-dotenv
```

### 步骤 6：配置 Worker

在 `worker` 目录创建 `.env` 文件：

```env
# ============================================
# Worker 标识（每个 Worker 必须唯一）
# ============================================
WORKER_ID=worker-你的名字-显卡型号
WORKER_NAME=你的电脑名称 RTX 3080

# ============================================
# 服务器连接
# ============================================
REMOTE_API_BASE=https://你的域名
WORKER_API_KEY=和服务器.env里的WORKER_API_KEY保持一致

# ============================================
# 模型配置
# ============================================
MODEL_ID=Tongyi-MAI/Z-Image-Turbo
DEVICE=cuda
USE_CPU_OFFLOAD=true

# ============================================
# 本地备份路径
# ============================================
LOCAL_BACKUP_ROOT=D:/Z-Image-Backup
```

### 步骤 7：首次运行（下载模型）

```bash
cd D:\Z-Image\worker
python worker.py
```

首次运行会自动下载模型（约 25GB），需要等待较长时间。

下载完成后会看到：

```
============================================================
  Z-Image Worker
  ID: worker-xxx-rtx3080
  Name: xxx RTX 3080
============================================================

[Worker] Pre-loading model...
[Generator] Loading model: Tongyi-MAI/Z-Image-Turbo
[Generator] Model loaded successfully
[Worker] Started! Polling interval: 2s
```

### 步骤 8：创建快捷启动脚本（Windows）

创建 `启动Worker.bat`：

```batch
@echo off
cd /d D:\Z-Image\worker
call venv\Scripts\activate
python worker.py
pause
```

双击即可启动 Worker。

---

## 第三部分：Linux DO OAuth 配置

Z-Image 使用 [Linux DO Connect](https://connect.linux.do) 进行用户认证。

### 步骤 1：注册应用

1. 访问 [https://connect.linux.do](https://connect.linux.do)
2. 使用 Linux DO 账号登录
3. 点击"创建应用"

### 步骤 2：填写应用信息

| 字段 | 填写内容 |
|------|----------|
| 应用名称 | Z-Image（或你喜欢的名字） |
| 应用描述 | AI 生图服务 |
| 回调地址 | `https://你的域名/api/auth/callback` |

### 步骤 3：获取凭据

创建成功后会显示：
- **Client ID**：一串字母数字
- **Client Secret**：一串字母数字（只显示一次，请保存好）

### 步骤 4：更新服务器配置

```bash
# 编辑后端环境变量
nano /var/www/zimage/server/.env

# 填入获取的值
LINUX_DO_CLIENT_ID=你的ClientID
LINUX_DO_CLIENT_SECRET=你的ClientSecret
LINUX_DO_REDIRECT_URI=https://你的域名/api/auth/callback
```

```bash
# 重启后端
systemctl restart zimage-api
```

---

## 第四部分：验证与测试

### 测试登录

1. 访问 `https://你的域名`
2. 点击"Linux DO 登录"
3. 授权后应该跳转回首页，显示你的用户名

### 测试生图

1. 确保 Worker 正在运行
2. 在首页输入 Prompt，点击"生成"
3. 应该能看到任务进入队列，然后开始生成
4. 生成完成后图片会显示在页面上

### 测试后台

1. 使用管理员账号登录（`.env` 中配置的 ADMIN_USERNAME）
2. 访问 `https://你的域名/admin`
3. 应该能看到用户列表、任务列表、Worker 状态

---

## 日常运维

### 查看日志

```bash
# 后端日志
journalctl -u zimage-api -f

# 前端日志
pm2 logs zimage-web

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 重启服务

```bash
# 重启后端
systemctl restart zimage-api

# 重启前端
pm2 restart zimage-web

# 重启 Nginx
systemctl restart nginx
```

### 更新代码

```bash
# 本地构建前端
cd web
npm run build

# 上传到服务器
scp -r .next root@服务器:/var/www/zimage/web/

# 重启前端
ssh root@服务器 "pm2 restart zimage-web"

# 上传后端
scp -r server/app root@服务器:/var/www/zimage/server/

# 重启后端
ssh root@服务器 "systemctl restart zimage-api"
```

### 备份数据

```bash
# 备份数据库
scp root@服务器:/var/www/zimage/server/data/zimage.db ./backup/

# 备份图片（可能很大）
rsync -avz root@服务器:/var/www/zimage/server/storage/ ./backup/storage/
```

### 续期 SSL 证书

Certbot 会自动续期，但可以手动测试：

```bash
certbot renew --dry-run
```

---

## 常见问题

### Q: 502 Bad Gateway

**原因**：后端未运行或崩溃

**解决**：
```bash
# 查看后端状态
systemctl status zimage-api

# 查看详细日志
journalctl -u zimage-api -n 100

# 重启后端
systemctl restart zimage-api
```

### Q: Worker 连接失败

**检查清单**：
1. `WORKER_API_KEY` 是否和服务器一致？
2. `REMOTE_API_BASE` 是否正确（带 `https://`）？
3. 服务器防火墙是否放行 443 端口？

```bash
# 在 Worker 电脑测试连接
curl https://你的域名/api/health
# 应该返回 {"status":"ok"}
```

### Q: 图片无法显示

**解决**：
```bash
# 检查存储目录权限
ls -la /var/www/zimage/server/storage/

# 确保 Nginx 配置正确
nginx -t
systemctl restart nginx
```

### Q: 生成很慢

**可能原因**：
1. GPU 显存不足，启用了 CPU Offload
2. 网络上传速度慢

**优化**：
- 使用更高显存的 GPU
- 降低生成分辨率
- 确保 Worker 电脑网络畅通

### Q: 忘记管理员密码

```bash
# 编辑后端环境变量
nano /var/www/zimage/server/.env

# 修改 ADMIN_PASSWORD
ADMIN_PASSWORD=新密码

# 重启后端
systemctl restart zimage-api
```

---

## 技术栈总结

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 15 + React 19 + Tailwind CSS | 现代化 React 框架 |
| 后端 | FastAPI + SQLAlchemy + SQLite | 高性能 Python API |
| AI 模型 | Diffusers + Z-Image-Turbo | 阿里通义万相模型 |
| 进程管理 | PM2 + systemd | 前端用 PM2，后端用 systemd |
| 反向代理 | Nginx | 负责 HTTPS、负载均衡 |
| 认证 | Linux DO Connect OAuth | 第三方登录 |

---

## 获取帮助

如有问题，可以：
1. 查看本文档的"常见问题"部分
2. 检查服务日志定位问题
3. 在 Linux DO 论坛发帖求助

祝你部署顺利！🎉
