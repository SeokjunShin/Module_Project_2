#!/bin/bash
# Docker 이미지 빌드 및 푸시 스크립트
# Usage: ./build-and-push.sh [REGISTRY] [TAG]
# Example: ./build-and-push.sh myregistry.com v1.0.0

REGISTRY=${1:-""}
TAG=${2:-"latest"}

echo "=========================================="
echo "Trading CTF Platform - Docker Build"
echo "=========================================="

# Registry prefix
if [ -n "$REGISTRY" ]; then
    PREFIX="${REGISTRY}/"
else
    PREFIX=""
fi

echo "Registry: ${REGISTRY:-local}"
echo "Tag: ${TAG}"
echo ""

# Build Frontend
echo "[1/2] Building Frontend..."
docker build -t ${PREFIX}trading-ctf-frontend:${TAG} -f frontend/Dockerfile.prod frontend/

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✅ Frontend built: ${PREFIX}trading-ctf-frontend:${TAG}"

# Build Backend
echo ""
echo "[2/2] Building Backend..."
docker build -t ${PREFIX}trading-ctf-backend:${TAG} -f backend/Dockerfile.prod backend/

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi
echo "✅ Backend built: ${PREFIX}trading-ctf-backend:${TAG}"

# Push to registry if specified
if [ -n "$REGISTRY" ]; then
    echo ""
    echo "Pushing to registry..."
    docker push ${PREFIX}trading-ctf-frontend:${TAG}
    docker push ${PREFIX}trading-ctf-backend:${TAG}
    echo "✅ Images pushed to ${REGISTRY}"
fi

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo ""
echo "Images created:"
echo "  - ${PREFIX}trading-ctf-frontend:${TAG}"
echo "  - ${PREFIX}trading-ctf-backend:${TAG}"
echo ""
echo "To run locally:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "To push to Docker Hub:"
echo "  docker login"
echo "  ./build-and-push.sh yourusername v1.0.0"
