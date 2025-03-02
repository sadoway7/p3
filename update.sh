#!/bin/sh
# Script to update and rebuild the application

# Pull latest changes
git pull

# Note: This script assumes package.docker.json exists and is maintained
# If you've added new dependencies, make sure to update package.docker.json
# to avoid platform compatibility issues (Windows vs Linux)

# Rebuild Docker image
docker build -t rumfor-app:latest .

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