$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Version = "v24.15.0"
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

$ShellExe = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
if (!$ShellExe) {
  $ShellExe = (Get-Command powershell -ErrorAction Stop).Source
}

Write-Host "Using project-local Node:" -ForegroundColor Green
& $NodeExe -v
Write-Host "Project: $ProjectRoot" -ForegroundColor Green
Write-Host ""
Write-Host "Opening new shell with Node 24 active..." -ForegroundColor Cyan
Write-Host "Run inside new shell:" -ForegroundColor Cyan
Write-Host "  pnpm install"
Write-Host "  pnpm prisma:generate"
Write-Host "  pnpm dev"

$Command = "`$env:Path = '$NodeDir;' + `$env:Path; Set-Location '$ProjectRoot'; Write-Host 'Node active:' -ForegroundColor Green; node -v"
& $ShellExe -NoExit -Command $Command
