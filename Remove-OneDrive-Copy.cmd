@echo off
echo Removing the old OneDrive copy of perotech-portfolio...
rd /s /q "%USERPROFILE%\OneDrive\Desktop\perotech-portfolio"
if exist "%USERPROFILE%\OneDrive\Desktop\perotech-portfolio" (
  echo.
  echo STILL LOCKED. Close any VS Code / File Explorer / terminal window that has the
  echo OneDrive "perotech-portfolio" folder open, then run this script again.
) else (
  echo.
  echo DONE. The OneDrive copy has been removed.
)
echo.
pause
