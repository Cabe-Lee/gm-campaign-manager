@echo off
REM GM Vault: install packages, create the database tables (only if missing), and start the app.
cd /d "%~dp0"

echo Installing packages (this can take a minute or two)...
call npm install > setup.log 2>&1

echo Checking the database and creating tables if needed...
call npm run db:setup >> setup.log 2>&1

type setup.log
echo.
echo ===============================================
echo Starting the app. Open http://localhost:3000
echo Press Ctrl+C in this window to stop it.
echo ===============================================
call npm run dev
pause
