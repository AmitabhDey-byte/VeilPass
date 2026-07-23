$ErrorActionPreference = "Stop"

$repoPath = (Get-Location).Path
$wslProject = "/mnt/d/Midnight-main"
$compactPath = ""

if (Get-Command wsl.exe -ErrorAction SilentlyContinue) {
  $compactPath = (wsl.exe bash -lc "command -v compact 2>/dev/null || true" 2>$null).Trim()
}

if (-not [string]::IsNullOrWhiteSpace($compactPath) -and $compactPath -notmatch "Windows/System32/compact") {
  wsl.exe bash -lc "set -euo pipefail; cd '$wslProject'; compact compile contracts/veil-allowlist.compact managed/veil-allowlist"
  exit $LASTEXITCODE
}

if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) {
  throw "Midnight Compact CLI was not found. Install Docker Desktop with Linux containers using the Hyper-V backend, then run this script again. Do not use PowerShell's built-in compact.exe."
}

$dockerCommand = 'apk add --no-cache bash curl ca-certificates; curl --proto ''=https'' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh; export PATH="$HOME/.compact/bin:$PATH"; compact update 0.31.0; compact compile contracts/veil-allowlist.compact managed/veil-allowlist'
docker.exe run --rm --pull always -v "${repoPath}:/workspace" -w /workspace alpine:3.22 sh -lc $dockerCommand
exit $LASTEXITCODE
