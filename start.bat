@echo off
cd /d "%~dp0"
title Scooter Business App

echo ========================================
echo   Scooter Business App - Dev Server
echo ========================================
echo.

echo Starting development server...
echo Opening browser in 3 seconds...
echo.

timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo.
echo Development server starting...
echo Press Ctrl+C to stop the server
echo.
npm run dev

echo.
echo Server stopped.
pause
