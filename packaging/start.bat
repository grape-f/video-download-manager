@echo off
setlocal
cd /d "%~dp0"

set HOST=127.0.0.1
set PORT=8787
set NODE_ENV=production
set YTDLP_PATH=%CD%\bin\yt-dlp.exe
set FFMPEG_PATH=%CD%\bin\ffmpeg
set DATA_DIR=%CD%\data
set DOWNLOAD_DIR=%CD%\downloads
set ENABLE_SIMULATE=false

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"

echo Starting Video Download Manager...
echo URL: http://%HOST%:%PORT%
echo Close this window to stop the server.
echo.

start "" /min cmd /c "timeout /t 2 /nobreak >nul && start http://%HOST%:%PORT%/"

"%CD%\node\node.exe" "%CD%\server\dist\index.js"

echo.
echo Server stopped. Press any key to close this window.
pause >nul
