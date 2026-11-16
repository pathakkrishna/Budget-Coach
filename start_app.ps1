# Personal Finance Budget Coach - Launch Script

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Launching Personal Finance Budget Coach Web App" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend Server
Write-Host "`n[1/2] Starting Backend API on http://127.0.0.1:8000..." -ForegroundColor Green
$backend = Start-Process -FilePath "d:\Personal_Finance_Budget_Coach\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn server:app --host 127.0.0.1 --port 8000" -PassThru

# 2. Start Vite React Frontend
Write-Host "[2/2] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Set-Location -Path "d:\Personal_Finance_Budget_Coach\frontend"
Start-Process -FilePath "npm" -ArgumentList "run dev"

Write-Host "`nApplication is running!" -ForegroundColor Cyan
Write-Host "Open your browser at: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API Documentation: http://127.0.0.1:8000/docs" -ForegroundColor Yellow
