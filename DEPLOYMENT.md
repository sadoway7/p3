# Deployment Guide

This guide explains how to deploy the application to a Docker container on Unraid using GitHub as the source repository.

## Platform Compatibility Note

The application was originally developed on Windows, but Docker runs on Linux. To address platform compatibility issues:

1. We've directly removed Windows-specific dependencies from package.json
2. Specifically, we removed `@rollup/rollup-win32-x64-msvc` and the local file reference
3. This prevents the platform compatibility errors during npm install

### How it works

The solution works through direct modification:

1. The package.json file has been modified to remove:
   - The Windows-specific package: `@rollup/rollup-win32-x64-msvc`
   - The local file reference: `vite-react-typescript-starter: file:`
   
2. The Dockerfile is now simplified to just copy and use the clean package.json

3. If you add new dependencies in the future that are platform-specific, you'll need to:
   - Add them only to your development environment
   - Make sure they're not in the package.json that gets committed to GitHub

## Prerequisites

- Git installed on your Unraid server
- Docker installed on your Unraid server
- SSH access to your Unraid server
- Your application code pushed to a GitHub repository

## Initial Setup on Unraid

1. SSH into your Unraid server
   ```bash
   ssh username@unraid-ip
   ```

2. Create a directory for your application
   ```bash
   mkdir -p /mnt/user/appdata/rumfor-app
   cd /mnt/user/appdata/rumfor-app
   ```

3. Clone your GitHub repository
   ```bash
   git clone https://github.com/yourusername/your-repo.git .
   ```

4. Create the environment variables file
   ```bash
   cp .env.docker.example .env.docker
   # Edit .env.docker with your actual values if needed
   ```

5. Make the update script executable
   ```bash
   chmod +x update.sh
   ```

6. Make the update script executable (on Linux/Mac)
   ```bash
   chmod +x update.sh sync-package-files.js
   ```
   Note: This step is only needed on Linux/Mac. On Windows, the permissions will be handled by Docker.

7. Run the update script to build and start the container
   ```bash
   source .env.docker && ./update.sh
   ```

## Updating After Code Changes

1. Push your changes to GitHub from your development machine

2. SSH into your Unraid server and navigate to your project directory
   ```bash
   ssh username@unraid-ip
   cd /mnt/user/appdata/rumfor-app
   ```

3. Run the update script to pull changes and restart the container
   ```bash
   source .env.docker && ./update.sh
   ```

## Accessing Your Application

### Default Access
- Frontend: http://unraid-ip:3000
- Backend API: http://unraid-ip:3001

### Auto-update on Startup

The container has been configured to automatically pull the latest code from GitHub when it starts:

1. The GitHub repository is mounted into the container
2. On startup, the container will:
   - Pull the latest code from GitHub
   - Rebuild if necessary
   - Start both the frontend and backend

This means you can update your app by either:
- Restarting the container: `docker restart rumfor-app`
- Or pushing changes to GitHub and waiting for the next restart

### Domain Configuration
The application has been configured to support the following domains:
- l2.sadoway.ca
- rumfor.com

#### Setting Up Domain Access on Unraid

To properly route these domains to your application running in Docker on Unraid, you'll need to set up a reverse proxy. Here's how to do it:

1. **Install Nginx Proxy Manager on Unraid**:
   - Go to the Apps tab in the Unraid web UI
   - Search for "Nginx Proxy Manager"
   - Install it using the default settings

2. **Configure Nginx Proxy Manager**:
   - Access Nginx Proxy Manager UI (usually at http://unraid-ip:81)
   - Add a new proxy host for each domain:
     - Domain: l2.sadoway.ca
     - Scheme: http
     - Forward Hostname/IP: [your-docker-container-ip]
     - Forward Port: 3000
     - Enable SSL (recommended)
   - Repeat for rumfor.com

3. **DNS Configuration**:
   - Make sure both domains (l2.sadoway.ca and rumfor.com) have DNS A records pointing to your Unraid server's public IP
   - If using a home server, configure port forwarding on your router (ports 80 and 443) to your Unraid server

4. **API Domain Configuration**:
   - The frontend needs to know where to find the API
   - In your .env.docker file, update the VITE_API_BASE_URL to use a domain if needed

## Troubleshooting

If you encounter issues:

1. Check Docker logs
   ```bash
   docker logs rumfor-app
   ```

2. Verify your environment variables
   ```bash
   cat .env.docker
   ```

3. Check if the container is running
   ```bash
   docker ps | grep rumfor-app
   ```

4. Rebuild the container from scratch
   ```bash
   docker stop rumfor-app
   docker rm rumfor-app
   docker rmi rumfor-app
   source .env.docker && ./update.sh
   ```

## Security Notes

- Never commit the `.env.docker` file to GitHub
- The `.env.docker.example` file is committed as a template
- On production, consider using Docker secrets for sensitive information