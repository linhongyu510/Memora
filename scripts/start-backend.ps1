# Memora 后端启动脚本 (PowerShell)
$backendDir = Join-Path $PSScriptRoot "..\\backend"
Set-Location $backendDir

if (-not (Test-Path ".venv\\Scripts\\python.exe")) {
    python -m venv .venv
}

$pythonExe = Join-Path $backendDir ".venv\\Scripts\\python.exe"

if (-not (Test-Path ".venv\\Lib\\site-packages\\fastapi")) {
    & $pythonExe -m pip install -r requirements.txt
}

& $pythonExe run.py
