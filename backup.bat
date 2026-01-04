REM 本地端Git手動存檔
@echo off
git add .
git commit -m "Manual Backup: %date% %time%"
echo Backup Complete!
pause