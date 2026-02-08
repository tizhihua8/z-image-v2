@echo off
REM ============================================
REM Z-Image v3 Windows 一键部署脚本
REM ============================================
REM 使用方法:
REM   deploy-docker.bat [选项]
REM
REM 选项:
REM   all       - 部署所有服务 (默认)
REM   server    - 仅部署服务器
REM   worker    - 仅部署 Worker

setlocal enabledelayedexpansion

REM ============================================
REM 配置变量
REM ============================================
set MODE=%1
if "%MODE%"=="" set MODE=all

set SCRIPT_DIR=%~dp0
set DOCKER_COMPOSE_CMD=docker-compose

REM ============================================
REM 颜色定义 (Windows 10+)
REM ============================================
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "RED=%ESC%[31m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "NC=%ESC%[0m"

REM ============================================
REM 显示 Banner
REM ============================================
echo %BLUE%
echo ========================================
echo   Z-Image v3 容器化部署工具 (Windows)
echo ========================================
echo %NC%

REM ============================================
REM 环境检测
REM ============================================
echo [INFO] 检测运行环境...

where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR]%NC% Docker 未安装，请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [INFO] Docker 已安装
docker --version

REM ============================================
REM 配置环境
REM ============================================
echo [INFO] 配置环境变量...

if not exist ".env" (
    if exist ".env.docker.example" (
        copy ".env.docker.example" ".env" >nul
        echo [INFO] 已创建 .env 配置文件
        echo %YELLOW%[WARN]%NC% 请编辑 .env 文件，填写必要的配置项
        echo        按任意键继续，或 Ctrl+C 取消...
        pause >nul
    ) else (
        echo %RED%[ERROR]%NC% 找不到 .env.docker.example 模板文件
        pause
        exit /b 1
    )
) else (
    echo [INFO] 使用现有 .env 配置文件
)

REM ============================================
REM 构建镜像
REM ============================================
echo [INFO] 构建 Docker 镜像...

if "%MODE%"=="all" goto :build_all
if "%MODE%"=="server" goto :build_server
if "%MODE%"=="worker" goto :build_worker

:build_all
echo [INFO] 构建所有服务镜像...
docker-compose build
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR]%NC% 镜像构建失败
    pause
    exit /b 1
)
goto :start_all

:build_server
echo [INFO] 构建服务器镜像...
docker-compose build server web
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR]%NC% 镜像构建失败
    pause
    exit /b 1
)
goto :start_server

:build_worker
echo [INFO] 构建 Worker 镜像...
docker-compose -f docker-compose.worker.yml build
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR]%NC% 镜像构建失败
    pause
    exit /b 1
)
goto :start_worker

REM ============================================
REM 启动服务
REM ============================================

:start_all
echo [INFO] 启动所有服务...
docker-compose up -d
goto :show_info

:start_server
echo [INFO] 启动服务器...
docker-compose up -d server web
goto :show_info

:start_worker
echo [INFO] 启动 Worker...
docker-compose -f docker-compose.worker.yml up -d
goto :show_info

REM ============================================
REM 显示信息
REM ============================================

:show_info
echo.
echo %GREEN%========================================
echo   部署完成!
echo =========================================%NC%
echo.
echo 服务状态:
echo   查看: docker-compose ps
echo.
echo 查看日志:
echo   所有: docker-compose logs -f
echo   后端: docker-compose logs -f server
echo   前端: docker-compose logs -f web
echo.
echo 停止服务:
echo   docker-compose down
echo.
echo 重启服务:
echo   docker-compose restart
echo.
echo 访问地址:
echo   前端: http://localhost:3000
echo   后端: http://localhost:8000
echo   后台: http://localhost:3000/admin
echo.

pause
