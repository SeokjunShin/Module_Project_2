# Docker 이미지 빌드 및 푸시 스크립트 (Windows PowerShell)
# Usage: .\build-and-push.ps1 [-Registry "myregistry.com"] [-Tag "v1.0.0"]

param(
    [string]$Registry = "",
    [string]$Tag = "latest"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Trading CTF Platform - Docker Build" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Registry prefix
if ($Registry) {
    $Prefix = "${Registry}/"
} else {
    $Prefix = ""
}

Write-Host "Registry: $(if($Registry) { $Registry } else { 'local' })"
Write-Host "Tag: $Tag"
Write-Host ""

# Build Frontend
Write-Host "[1/2] Building Frontend..." -ForegroundColor Yellow
docker build -t "${Prefix}trading-ctf-frontend:${Tag}" -f frontend/Dockerfile.prod frontend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend built: ${Prefix}trading-ctf-frontend:${Tag}" -ForegroundColor Green

# Build Backend
Write-Host ""
Write-Host "[2/2] Building Backend..." -ForegroundColor Yellow
docker build -t "${Prefix}trading-ctf-backend:${Tag}" -f backend/Dockerfile.prod backend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend built: ${Prefix}trading-ctf-backend:${Tag}" -ForegroundColor Green

# Push to registry if specified
if ($Registry) {
    Write-Host ""
    Write-Host "Pushing to registry..." -ForegroundColor Yellow
    docker push "${Prefix}trading-ctf-frontend:${Tag}"
    docker push "${Prefix}trading-ctf-backend:${Tag}"
    Write-Host "✅ Images pushed to $Registry" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Images created:"
Write-Host "  - ${Prefix}trading-ctf-frontend:${Tag}"
Write-Host "  - ${Prefix}trading-ctf-backend:${Tag}"
Write-Host ""
Write-Host "To run locally:"
Write-Host "  docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "To push to Docker Hub:"
Write-Host "  docker login"
Write-Host "  .\build-and-push.ps1 -Registry 'yourusername' -Tag 'v1.0.0'" -ForegroundColor Yellow
