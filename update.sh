#!/bin/sh
# Script to update and rebuild the application

# Pull latest changes
git pull

# Completely remove the old image and container to force a clean rebuild
docker stop rumfor-app || true
docker rm rumfor-app || true
docker rmi rumfor-app:latest || true

# Rebuild Docker image from scratch (no cache)
docker build --no-cache -t rumfor-app:latest .

# Stop and remove old container
docker stop rumfor-app || true
docker rm rumfor-app || true

# Get current directory to mount git repository
REPO_DIR=$(pwd)

# Run new container with environment variables and git repo mounted
docker run -d --name rumfor-app -p 3000:3000 -p 3001:3001 \
  -e API_KEY=${API_KEY} \
  -e DB_HOST=${DB_HOST} \
  -e DB_PORT=${DB_PORT} \
  -e DB_USER=${DB_USER} \
  -e DB_PASSWORD=${DB_PASSWORD} \
  -e DB_NAME=${DB_NAME} \
  -e JWT_SECRET=${JWT_SECRET} \
  -e VITE_API_BASE_URL=${VITE_API_BASE_URL:-/api} \
  -e GIT_REPO_URL=$(git config --get remote.origin.url) \
  -v ${REPO_DIR}/.git:/app/.git \
  echo "Starting backend server..." \n \
  cd backend && npm start & \n \
  echo "Starting frontend server with API proxy..." \n \
  npx vite preview --host 0.0.0.0 --port 3000 \n \
  rumfor-app:latest

echo "Application updated successfully!"
echo "The container will automatically pull the latest code from GitHub on startup."