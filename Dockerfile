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

# Start application
CMD cd backend && npm start && npx vite preview --host 0.0.0.0
