@echo off
REM Lanzador — Finanzas Personales (inicia servidor local y abre la app)
cd /d "%~dp0"
start "Finanzas Personales" /min node server.js 8080
timeout /t 2 /nobreak >nul
start http://localhost:8080
