# build.ps1 - Build e push da imagem Docker para o GitHub Container Registry (ghcr.io)
# Uso: .\k8s\build.ps1 [-Tag <tag>] [-Push]

param(
    [string]$Tag = "latest",
    [switch]$Push
)

$ErrorActionPreference = "Stop"

$ImageName = "ghcr.io/denileo82/myfamily-expenses"
$FullImage = "$ImageName`:$Tag"

Write-Host "==> Build da imagem: $FullImage" -ForegroundColor Cyan

# Build a partir da raiz do projeto (pasta pai do k8s)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
docker build -t $FullImage $ProjectRoot
if ($LASTEXITCODE -ne 0) { throw "Falha no build da imagem" }

if ($Push) {
    Write-Host "==> Login no ghcr.io (use um PAT com escopo write:packages)" -ForegroundColor Cyan
    docker login ghcr.io
    if ($LASTEXITCODE -ne 0) { throw "Falha no login no ghcr.io" }

    Write-Host "==> Push da imagem: $FullImage" -ForegroundColor Cyan
    docker push $FullImage
    if ($LASTEXITCODE -ne 0) { throw "Falha no push da imagem" }

    Write-Host "==> Imagem publicada: $FullImage" -ForegroundColor Green
}
else {
    Write-Host "==> Build concluido (sem push). Use -Push para publicar." -ForegroundColor Green
}
