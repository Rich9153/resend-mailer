@echo off
echo Demarrage de Resend Mailer...
start "" "http://localhost:3030"
node "%~dp0server.js"
pause
