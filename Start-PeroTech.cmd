@echo off
title PeroTech Portfolio
cd /d "%~dp0backend"
echo Starting PeroTech at http://localhost:5000 ...
start "" http://localhost:5000
node server.js
pause
