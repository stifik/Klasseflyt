@echo off
echo ========================================
echo Starting Klasseflyt NFC Bridge Server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting NFC Bridge Server...
echo.
echo IMPORTANT: Keep this window open!
echo The server must run while using Klasseflyt.
echo.
echo Press Ctrl+C to stop the server.
echo ========================================
echo.

call npm start
