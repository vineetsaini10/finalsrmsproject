param(
  [string]$ComposeFile = "docker-compose.prod.yml",
  [string]$EnvFile = ".env",
  [switch]$SkipBuild,
  [switch]$RunSmoke
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$text) {
  Write-Host ""
  Write-Host "==> $text" -ForegroundColor Cyan
}

function Fail([string]$msg) {
  throw "DEPLOY FAILED: $msg"
}

function Assert-Exists([string]$path, [string]$what) {
  if (-not (Test-Path $path)) {
    Fail "$what not found at '$path'"
  }
}

function Parse-EnvFile([string]$path) {
  $vars = @{}
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $vars[$key] = $value
  }
  return $vars
}

function Assert-StrongSecret([hashtable]$envMap, [string]$key) {
  if (-not $envMap.ContainsKey($key)) {
    Fail "Missing '$key' in $EnvFile"
  }
  $val = $envMap[$key]
  if ($val.Length -lt 24) {
    Fail "'$key' is too short (must be at least 24 chars)"
  }
  $weak = @(
    "replace_with_strong_secret",
    "replace_with_strong_refresh_secret",
    "change_me_in_production",
    "change_me_refresh_in_production",
    "your_super_secret_jwt_key_here",
    "your_super_secret_refresh_key_here"
  )
  if ($weak -contains $val) {
    Fail "'$key' is using a placeholder value"
  }
}

Write-Step "Pre-checks"

# Ensure script runs from repo root
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Assert-Exists $ComposeFile "Compose file"
Assert-Exists $EnvFile "Environment file"
Assert-Exists "aiml\models\waste_classifier\best_model.pth" "AI model weights"

$dockerVersion = & docker --version 2>$null
if ($LASTEXITCODE -ne 0) {
  Fail "Docker CLI not available"
}
Write-Host $dockerVersion

& docker info 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Fail "Docker daemon is not running"
}

$envMap = Parse-EnvFile $EnvFile
Assert-StrongSecret $envMap "JWT_SECRET"
Assert-StrongSecret $envMap "JWT_REFRESH_SECRET"
if (-not $envMap.ContainsKey("NEXT_PUBLIC_MAPBOX_TOKEN") -or [string]::IsNullOrWhiteSpace($envMap["NEXT_PUBLIC_MAPBOX_TOKEN"])) {
  Fail "Missing NEXT_PUBLIC_MAPBOX_TOKEN in $EnvFile"
}

Write-Step "Validating compose configuration"
& docker compose --env-file $EnvFile -f $ComposeFile config 1>$null
if ($LASTEXITCODE -ne 0) {
  Fail "docker compose config validation failed"
}
Write-Host "Compose config is valid."

Write-Step "Deploying production stack"
if ($SkipBuild) {
  & docker compose --env-file $EnvFile -f $ComposeFile up -d
} else {
  & docker compose --env-file $EnvFile -f $ComposeFile up -d --build
}
if ($LASTEXITCODE -ne 0) {
  Fail "docker compose up failed"
}

Write-Step "Current service status"
& docker compose --env-file $EnvFile -f $ComposeFile ps

if ($RunSmoke) {
  Write-Step "Running smoke test"
  & powershell -ExecutionPolicy Bypass -File "scripts\smoke-test.ps1"
  if ($LASTEXITCODE -ne 0) {
    Fail "Smoke test failed after deployment"
  }
}

Write-Host ""
Write-Host "Deployment completed successfully." -ForegroundColor Green
