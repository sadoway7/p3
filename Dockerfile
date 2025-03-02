# Use Node.js as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Environment variables for npm
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies (Windows-specific dependencies are already removed in package.json)
RUN npm install
RUN cd backend && npm install

# Copy application files
COPY . .

# Add healthcheck script
RUN chmod +x /app/healthcheck.sh

# Build frontend and backend
RUN npm run build
RUN npm run backend:build

# Environment variables will be provided by Unraid UI

ENV NODE_ENV=production

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Create startup script - pulls latest from GitHub before starting
RUN echo '#!/bin/sh \n \
  cd /app \n \
  echo "Pulling latest code from GitHub..." \n \
  git pull \n \
  echo "Rebuilding if needed..." \n \
  npm install \n \
  npm run build \n \
  cd backend && npm install && npm run build \n \
  echo "Setting up backend environment..." \n \
  export HOST=0.0.0.0 \n \
  echo "Starting backend server..." \n \
  # Start backend server and save its process ID
  echo "Starting backend server..." \n \
  cd backend && npm start > /app/backend.log 2>&1 & \n \
  BACKEND_PID=$! \n \
  echo "Backend process ID: $BACKEND_PID" \n \
  echo "Waiting for backend server to initialize..." \n \
  sleep 5 \n \
  
  # Run initial health check
  echo "Running initial health check..." \n \
  cd /app && ./healthcheck.sh \n \
  
  # Additional waiting time for backend to fully initialize
  echo "Additional wait time..." \n \
  sleep 5 \n \
  
  # Second health check
  echo "Running second health check..." \n \
  cd /app && ./healthcheck.sh \n \
  
  # Start the frontend server
  cd /app \n \
  echo "Starting frontend server..." \n \
  npx vite preview --host 0.0.0.0 --port 3000 \n' > /app/start.sh && chmod +x /app/start.sh

# Start application
CMD ["/app/start.sh"]