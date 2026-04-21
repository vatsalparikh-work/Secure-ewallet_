@echo off
echo ==========================================
echo    Starting Secure eWallet Project
echo ==========================================

:: Start Backend (Express Server)
echo Starting Backend Server (Port 3000)...
start "Backend - Secure eWallet" cmd /k "npm run dev"

:: Start Frontend (Vite)
echo Starting Frontend Server (Port 5173)...
start "Frontend - Secure eWallet" /d "frontend" cmd /k "npm run dev"

:: Wait for servers to initialize (5 seconds)
echo Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

:: Directly open the project in the browser
echo Opening full website in browser...
start http://localhost:3000

echo.
echo ==========================================
echo    Secure eWallet is now running!
echo    - Main Website: http://localhost:3000
echo    - Admin Panel:   http://localhost:5173
echo ==========================================
echo.
echo Press any key to exit this launcher.
pause > nul
