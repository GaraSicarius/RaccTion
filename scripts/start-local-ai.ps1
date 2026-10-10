[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$runtimeUrl = 'https://github.com/ggml-org/llama.cpp/releases/download/b11429/llama-b11429-bin-win-cpu-x64.zip'
$runtimeSha256 = '1283323272b04cd07905816a597a0da810918102de958f4ff6f7bbaa70ed2efe'
$runtimeLength = 19398918
$modelUrl = 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf'
$modelSha256 = '9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031'
$modelLength = 639446688

$repoRoot = Split-Path -Parent $PSScriptRoot
$localAiDir = Join-Path $repoRoot '.local-ai'
$runtimeZip = Join-Path $localAiDir 'llama-b11429-bin-win-cpu-x64.zip'
$runtimeDir = Join-Path $localAiDir 'runtime'
$runtimeMarker = Join-Path $runtimeDir '.archive-sha256'
$serverExe = Join-Path $runtimeDir 'llama-server.exe'
$modelPath = Join-Path $localAiDir 'Qwen3-0.6B-Q8_0.gguf'
$sharedAiDir = Join-Path (Split-Path -Parent $repoRoot) 'local-ai'

function Test-Artifact {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][long]$Length,
    [Parameter(Mandatory = $true)][string]$Sha256
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
  $item = Get-Item -LiteralPath $Path
  if ($item.Length -ne $Length) { return $false }
  $actual = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
  return $actual -eq $Sha256
}

function Assert-LocalAiChildPath {
  param([Parameter(Mandatory = $true)][string]$Path)

  $root = (Resolve-Path -LiteralPath $localAiDir).Path.TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
  )
  $candidate = if (Test-Path -LiteralPath $Path) {
    (Resolve-Path -LiteralPath $Path).Path
  } else {
    [System.IO.Path]::GetFullPath($Path)
  }
  $prefix = $root + [System.IO.Path]::DirectorySeparatorChar
  if (-not $candidate.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing filesystem operation outside the repository .local-ai directory: $candidate"
  }
  return $candidate
}

function Get-VerifiedArtifact {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$SharedCandidate,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][long]$Length,
    [Parameter(Mandatory = $true)][string]$Sha256
  )

  if (Test-Artifact -Path $Destination -Length $Length -Sha256 $Sha256) {
    Write-Host "$Name already present and verified."
    return
  }

  if (Test-Path -LiteralPath $Destination) {
    Write-Warning "$Name is incomplete or has the wrong hash; replacing it."
    Remove-Item -LiteralPath $Destination -Force
  }

  if (Test-Artifact -Path $SharedCandidate -Length $Length -Sha256 $Sha256) {
    Write-Host "Copying verified $Name from the existing local download..."
    Copy-Item -LiteralPath $SharedCandidate -Destination $Destination
  } else {
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if (-not $curl) { throw 'curl.exe is required to download the local AI files.' }

    $partial = "$Destination.part"
    if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force }
    Write-Host "Downloading $Name from its pinned official source..."
    try {
      & $curl.Source --fail --location --retry 3 --retry-delay 2 --output $partial $Url
      if ($LASTEXITCODE -ne 0) { throw "curl.exe exited with code $LASTEXITCODE." }
      if (-not (Test-Artifact -Path $partial -Length $Length -Sha256 $Sha256)) {
        throw "$Name failed its size or SHA-256 verification."
      }
      Move-Item -LiteralPath $partial -Destination $Destination
    } finally {
      if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force }
    }
  }

  if (-not (Test-Artifact -Path $Destination -Length $Length -Sha256 $Sha256)) {
    throw "$Name failed verification after it was placed in .local-ai."
  }
}

New-Item -ItemType Directory -Path $localAiDir -Force | Out-Null

Get-VerifiedArtifact `
  -Name 'llama.cpp b11429 CPU runtime' `
  -Destination $runtimeZip `
  -SharedCandidate (Join-Path $sharedAiDir 'llama-cpu.zip') `
  -Url $runtimeUrl `
  -Length $runtimeLength `
  -Sha256 $runtimeSha256

Get-VerifiedArtifact `
  -Name 'Qwen3 0.6B Q8_0 model' `
  -Destination $modelPath `
  -SharedCandidate (Join-Path $sharedAiDir 'Qwen3-0.6B-Q8_0.gguf') `
  -Url $modelUrl `
  -Length $modelLength `
  -Sha256 $modelSha256

$runtimeIsCurrent = (Test-Path -LiteralPath $serverExe -PathType Leaf) -and
  (Test-Path -LiteralPath $runtimeMarker -PathType Leaf) -and
  ((Get-Content -LiteralPath $runtimeMarker -Raw).Trim() -eq $runtimeSha256)

if (-not $runtimeIsCurrent) {
  $stagingDir = Join-Path $localAiDir ('runtime-staging-' + [guid]::NewGuid().ToString('N'))
  $safeStagingDir = Assert-LocalAiChildPath -Path $stagingDir
  $safeRuntimeDir = Assert-LocalAiChildPath -Path $runtimeDir
  try {
    Write-Host 'Extracting the verified llama.cpp runtime...'
    Expand-Archive -LiteralPath $runtimeZip -DestinationPath $safeStagingDir
    $stagedServer = Join-Path $safeStagingDir 'llama-server.exe'
    if (-not (Test-Path -LiteralPath $stagedServer -PathType Leaf)) {
      throw 'The verified runtime archive did not contain llama-server.exe at its root.'
    }
    Set-Content -LiteralPath (Join-Path $safeStagingDir '.archive-sha256') -Value $runtimeSha256 -NoNewline
    if (Test-Path -LiteralPath $safeRuntimeDir) { Remove-Item -LiteralPath $safeRuntimeDir -Recurse -Force }
    Move-Item -LiteralPath $safeStagingDir -Destination $safeRuntimeDir
  } finally {
    $safeStagingDir = Assert-LocalAiChildPath -Path $stagingDir
    if (Test-Path -LiteralPath $safeStagingDir) { Remove-Item -LiteralPath $safeStagingDir -Recurse -Force }
  }
}

if (-not (Test-Artifact -Path $runtimeZip -Length $runtimeLength -Sha256 $runtimeSha256)) {
  throw 'The llama.cpp archive no longer passes verification.'
}
if (-not (Test-Artifact -Path $modelPath -Length $modelLength -Sha256 $modelSha256)) {
  throw 'The model no longer passes verification.'
}
if (-not (Test-Path -LiteralPath $serverExe -PathType Leaf)) {
  throw 'llama-server.exe is missing after runtime extraction.'
}

$origin = "chrome-extension://$ExtensionId"
Write-Host ''
Write-Host 'Starting RaccTion local AI at http://127.0.0.1:8081'
Write-Host "Allowed browser origin: $origin"
Write-Host 'Keep this window open while scanning. Press Ctrl+C to stop.'

& $serverExe `
  --model $modelPath `
  --alias 'qwen3-0.6b' `
  --host '127.0.0.1' `
  --port '8081' `
  --cors-origins $origin `
  --cors-methods 'GET,POST,OPTIONS' `
  --cors-headers 'Content-Type' `
  --no-cors-credentials `
  --no-webui `
  -t 2 `
  -tb 2 `
  -c 4096 `
  -np 1 `
  -ngl 0 `
  --cache-ram 0 `
  --reasoning off

if ($LASTEXITCODE -ne 0) { throw "llama-server.exe exited with code $LASTEXITCODE." }
