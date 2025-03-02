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

# Build frontend and backend
RUN npm run build
RUN npm run backend:build

# Environment variables will be provided by Unraid UI
ENV VITE_API_BASE_URL=/api
ENV NODE_ENV=production

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Create startup script
RUN echo '#!/bin/sh \n \
  cd /app \n \
  echo "Starting backend server..." \n \
  cd backend && npm start & \n \
  cd /app \n \
  echo "Starting frontend server..." \n \
  npx vite preview --host 0.0.0.0 --port 3000 \n' > /app/start.sh && chmod +x /app/start.sh

# Start application
CMD ["/app/start.sh"]