@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3001" ^| find "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
exit /b 0