$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$dist = Join-Path $projectRoot 'desktop-admin\dist-windows'
$releases = Join-Path $projectRoot 'releases'
$desktopRelease = Join-Path ([Environment]::GetFolderPath('Desktop')) 'DiagAuto Mada - Version installable'
$package = Get-Content -LiteralPath (Join-Path $projectRoot 'desktop-admin\package.json') -Raw | ConvertFrom-Json
$installer = "DiagAuto-Admin-$($package.version)-x64.exe"

New-Item -ItemType Directory -Path $releases -Force | Out-Null
New-Item -ItemType Directory -Path $desktopRelease -Force | Out-Null

$files = @(
  'latest.yml',
  $installer,
  "$installer.blockmap"
)

foreach ($file in $files) {
  $source = Join-Path $dist $file
  if (-not (Test-Path -LiteralPath $source)) {
    throw "Fichier de mise a jour introuvable: $source"
  }
  Copy-Item -LiteralPath $source -Destination $releases -Force
  Copy-Item -LiteralPath $source -Destination $desktopRelease -Force
}

Write-Host "Mise a jour locale publiee dans $releases"
