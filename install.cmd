@echo off
setlocal
set "EPASSWORD_INSTALL_BASE=%~dp0"
if exist "%~dp0desktop\Epassword.exe" (
  set "ELECTRON_RUN_AS_NODE=1"
  "%~dp0desktop\Epassword.exe" "%~dp0scripts\install.cjs" %*
) else (
  set "ELECTRON_RUN_AS_NODE="
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js 24 is required for source installation. Use the Setup ZIP for installation without Node.js.
    pause
    exit /b 1
  )
  node "%~dp0scripts\install.cjs" %*
)
set "INSTALL_EXIT=%ERRORLEVEL%"
if "%~1"=="" pause
exit /b %INSTALL_EXIT%
