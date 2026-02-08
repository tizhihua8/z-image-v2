@echo off
REM ============================================
REM Z-Image v3 单容器一键部署脚本 (Windows)
REM ============================================
REM 一个容器包含前端+后端+Nginx

setlocal enabledelayedexpansion

echo ========================================
echo   Z-Image v3 单容器部署
echo   前端 + 后端 + Nginx 合二为一
echo ========================================
echo.

REM 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未安装 Docker
    echo 请访问 https://docs.docker.com/desktop/install/windows-install/ 安装
    pause
    exit /b 1
)

REM 配置环境变量
echo [INFO] 配置环境变量...
if not exist ".env" (
    if exist ".env.docker.example" (
        copy ".env.docker.example" ".env"
        echo [INFO] 已创建 .env 文件，请编辑后重新运行
        notepad ".env"
        echo.
        echo [提示] 编辑完成后按任意键继续...
        pause >nul
    ) else (
        echo [错误] 找不到 .env.docker.example
        pause
        exit /b 1
    )
)

REM 构建镜像
echo [INFO] 构建单容器镜像（首次运行需要几分钟）...
docker compose -f docker-compose.single.yml build
if errorlevel 1 (
    echo [错误] 构建失败
    pause
    exit /b 1
)

REM 启动服务
echo [INFO] 启动服务...
docker compose -f docker-compose.single.yml up -d
if errorlevel 1 (
    echo [错误] 启动失败
    pause
    exit /b 1
)

REM 等待服务启动
echo [INFO] 等待服务启动...
timeout /t 15 /nobreak >nul

echo.
echo ========================================
echo   部署完成!
echo ========================================
echo.
echo 访问地址: http://localhost:80
echo.
echo 管理命令:
echo   查看日志: docker compose -f docker-compose.single.yml logs -f
echo   停止服务: docker compose -f docker-compose.single.yml down
echo   重启服务: docker compose -f docker-compose.single.yml restart
echo.
pause
