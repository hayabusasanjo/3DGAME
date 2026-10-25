@echo off
title Isekai Chronicles Local Server
echo ========================================================
echo   Starting Isekai Chronicles 3D Game Server...
echo ========================================================
echo.
cd /d "%~dp0"
start http://localhost:3000/
node server.js
pause
