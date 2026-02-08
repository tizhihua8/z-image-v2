#!/bin/bash
# Z-Image VPS 部署脚本
# 在 VPS 上运行此脚本

set -e

echo "======================================"
echo "  Z-Image 服务器部署脚本"
echo "======================================"

# 创建项目目录
echo "[1/7] 创建项目目录..."
mkdir -p /var/www/zimage
cd /var/www/zimage

# 安装 Python 虚拟环境
echo "[2/7] 设置 Python 环境..."
apt-get update
apt-get install -y python3-venv python3-pip

# 创建后端目录结构
mkdir -p server/data server/storage

# 创建虚拟环境
cd server
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖 (需要先上传 requirements.txt)
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

# 创建前端目录
echo "[3/7] 设置前端目录..."
mkdir -p /var/www/zimage/web

# 申请 SSL 证书
echo "[4/7] 申请 SSL 证书..."
if ! certbot certificates | grep -q "ryanai.org"; then
    certbot certonly --nginx -d ryanai.org --non-interactive --agree-tos -m your-email@example.com
fi

# 配置 Nginx
echo "[5/7] 配置 Nginx..."
if [ -f "/tmp/nginx-zimage.conf" ]; then
    cp /tmp/nginx-zimage.conf /etc/nginx/sites-available/ryanai.org
    ln -sf /etc/nginx/sites-available/ryanai.org /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
fi

# 创建 systemd 服务
echo "[6/7] 创建后端服务..."
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

systemctl daemon-reload
systemctl enable zimage-api

echo "[7/7] 部署完成！"
echo ""
echo "后续步骤:"
echo "1. 上传后端代码到 /var/www/zimage/server"
echo "2. 上传前端构建产物到 /var/www/zimage/web"
echo "3. 配置 .env 文件"
echo "4. 启动服务: systemctl start zimage-api"
echo "5. 用 PM2 启动前端"


