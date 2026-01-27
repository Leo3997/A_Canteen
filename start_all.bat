@echo off
CHCP 65001
echo ==========================================
echo       食堂视觉识别系统 一键启动
echo ==========================================

:: 启动后端服务
echo [1/2] 正在启动后端服务...
start "后端服务器 (Port 8000)" cmd /k "cd /d %~dp0 && venv\Scripts\python.exe run_server.py"

:: 等待几秒确保后端启动（可选）
timeout /t 3 /nobreak > nul

:: 启动前端服务
echo [2/2] 正在启动前端服务...
start "前端服务器 (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo ==========================================
echo 后端和前端已在独立窗口中启动。
echo [后端] 访问地址: http://localhost:8000/docs
echo [前端] 访问地址: http://localhost:5173
echo ==========================================
pause
