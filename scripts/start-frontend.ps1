# Memora 前端启动脚本 (PowerShell)
$rootDir = Join-Path $PSScriptRoot ".."
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source

Set-Location $rootDir
if (-not (Test-Path "node_modules")) {
    & $npmCmd install
}

& $npmCmd run dev
