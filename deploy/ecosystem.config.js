// PM2 生态系统配置 - 用于 VPS 前端部署
// 放置路径: /var/www/zimage/web/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'zimage-web',
      cwd: '/var/www/zimage/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_BASE: 'https://ryanai.org'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};


