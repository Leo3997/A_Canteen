@echo off
CHCP 65001 > nul
echo ==========================================
echo        食堂视觉识别系统 一键启动
echo ==========================================

:: 启动后端服务
:: 修复点1：给 %~dp0 加上英文双引号，防止路径解析错误
echo [1/2] 正在启动后端服务...
start "Backend Server" cmd /k "cd /d "%~dp0" && call conda activate Target_Recognition && python run_server.py"

:: 等待几秒
timeout /t 3 /nobreak > nul

:: 启动前端服务
:: 修复点2：给路径加引号，并移除标题中的特殊括号，改用英文标题更稳定
echo [2/2] 正在启动前端服务...
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && call conda activate Target_Recognition && npm run dev"

echo ==========================================
echo 后端和前端已在独立窗口中启动。
echo.
echo  后端接口文档: http://localhost:8000/docs
echo  前端访问地址: http://localhost:5173
echo ==========================================
pause