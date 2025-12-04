@echo off
REM Filosofi Yogya - Directus Start Script (Windows)
REM Usage: Double-click or run from CMD

echo ======================================
echo   Filosofi Yogya - Directus Backend
echo ======================================
echo.

REM Switch to Node 22 using fnm
echo [*] Switching to Node.js 22...
call fnm use 22

REM Check Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Using Node.js %NODE_VERSION%
echo.

REM Check PostgreSQL
netstat -an | findstr ":5432" >nul
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL is running
) else (
    echo [ERROR] PostgreSQL is NOT running!
    echo        Please start PostgreSQL service first
    pause
    exit /b 1
)
echo.

REM Start Directus
echo [*] Starting Directus...
echo     Admin Panel: http://localhost:8055
echo.
echo Press Ctrl+C to stop the server
echo ======================================
echo.

npm start
