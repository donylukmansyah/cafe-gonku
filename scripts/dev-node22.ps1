$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Version = "v22.21.1"
$ToolingDir = Join-Path $ProjectRoot ".tooling"
$NodeDir = Join-Path $ToolingDir "node-$Version-win-x64"
$NodeExe = Join-Path $NodeDir "node.exe"
$ZipPath = Join-Path $ToolingDir "node-$Version-win-x64.zip"

if (!(Test-Path $NodeExe)) {
  New-Item -ItemType Directory -Force -Path $ToolingDir | Out-Null
  $ProgressPreference = "SilentlyContinue"
  Invoke-WebRequest -Uri "https://nodejs.org/dist/$Version/node-$Version-win-x64.zip" -OutFile $ZipPath
  Expand-Archive -Path $ZipPath -DestinationPath $ToolingDir -Force
}

$env:Path = "$NodeDir;$env:Path"
Set-Location $ProjectRoot

Write-Host "Node active:" -ForegroundColor Green
node -v
Write-Host "Starting Next.js dev server..." -ForegroundColor Cyan
pnpm dev
