# Use Node.js as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.docker.json ./package.json
COPY backend/package*.json ./backend/

# Install dependencies
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
  node backend/dist/index.js & \n \
  npx serve -s dist -l 3000 \n' > /app/start.sh && chmod +x /app/start.sh

# Start application
CMD ["/app/start.sh"]