@echo off
echo =======================================================
echo   Launching Personal Finance Budget Coach Web App
echo =======================================================

echo [1/2] Starting Backend API on http://127.0.0.1:8000...
start cmd /k "d:\Personal_Finance_Budget_Coach\.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8000"

echo [2/2] Starting Vite React Frontend on http://localhost:5173...
cd frontend
start cmd /k "npm run dev"

echo.
echo Application launched! Open http://localhost:5173 in your browser.
pause
