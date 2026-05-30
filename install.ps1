param(
    [string]$EquicordPath = $env:EQUICORD_PATH
)

$ErrorActionPreference = "Stop"
$Plugin = "CustomProfiles"
$Repo = "https://github.com/Equicord/Equicord.git"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

function Require-Cmd($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "missing $name — install it first (https://nodejs.org, https://git-scm.com)"
    }
}

function Ensure-Pnpm {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) { return }
    Step "pnpm not found, setting up"
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        corepack enable | Out-Null
        corepack prepare pnpm@latest --activate | Out-Null
    }
    elseif (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install -g pnpm
    }
    else {
        throw "need node/npm or corepack for pnpm"
    }
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        throw "pnpm setup failed"
    }
}

function Get-DefaultEquicordPath {
    if ($EquicordPath) { return $EquicordPath }
    $candidates = @(
        "$env:USERPROFILE\Documents\Equicord",
        "$env:USERPROFILE\Equicord"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    return "$env:USERPROFILE\Documents\Equicord"
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if ($isAdmin) {
    Write-Warning "running as admin can break Discord inject — use a normal terminal if inject fails"
}

Require-Cmd git
Require-Cmd node
Ensure-Pnpm

$Eq = Get-DefaultEquicordPath

if (-not (Test-Path $Eq)) {
    Step "cloning Equicord -> $Eq"
    New-Item -ItemType Directory -Force -Path (Split-Path $Eq) | Out-Null
    git clone --depth 1 $Repo $Eq
}
elseif (-not (Test-Path (Join-Path $Eq "package.json"))) {
    throw "$Eq exists but is not an Equicord folder"
}

$Dest = Join-Path $Eq "src\userplugins\$Plugin"
Step "installing plugin -> $Dest"
New-Item -ItemType Directory -Force -Path (Split-Path $Dest) | Out-Null
if (Test-Path $Dest) { Remove-Item -Recurse -Force $Dest }
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Copy-Item (Join-Path $Root "index.tsx") (Join-Path $Dest "index.tsx")

Step "installing dependencies"
Push-Location $Eq
try {
    pnpm install --frozen-lockfile
    Step "building"
    pnpm build
    Step "injecting into Discord (pick your install if asked)"
    pnpm inject
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "done."
Write-Host "restart Discord, then enable CustomProfiles in Equicord settings."
