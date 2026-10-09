@echo off
cd /d "%~dp0"
start "Store Run server" /min cmd /c "python -m http.server 8420"
timeout /t 1 /nobreak >nul
start "" http://localhost:8420/
