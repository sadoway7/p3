#!/bin/sh
# Script to update and rebuild the application

# Pull latest changes
git pull

# Note: We use fix-package-json.js during Docker build to automatically
# handle platform compatibility issues between Windows and Linux

# Rebuild Docker image with additional arguments to help with compatibility
docker build -t rumfor-app:latest \
  --build-arg NPM_CONFIG_PLATFORM=linux \
  --build-arg NODE_ENV=production .

# Stop and remove old container
docker stop rumfor-app || true
docker rm rumfor-app || true

# Run new container with environment variables
docker run -d --name rumfor-app -p 3000:3000 -p 3001:3001 \
  -e API_KEY=${API_KEY} \
  -e DB_HOST=${DB_HOST} \
  -e DB_PORT=${DB_PORT} \
  -e DB_USER=${DB_USER} \
  -e DB_PASSWORD=${DB_PASSWORD} \
  -e DB_NAME=${DB_NAME} \
  -e JWT_SECRET=${JWT_SECRET} \
  -e VITE_API_BASE_URL=${VITE_API_BASE_URL:-/api} \
  rumfor-app:latest

echo "Application updated successfully!"