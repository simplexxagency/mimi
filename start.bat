@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules" (
 echo Installing Mimi dependencies...
 call npm ci
 if errorlevel 1 exit /b 1
)
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:5173"
call npm run dev
