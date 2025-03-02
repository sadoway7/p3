# Deployment Guide

This guide explains how to deploy the application to a Docker container on Unraid using GitHub as the source repository.

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

6. Run the update script to build and start the container
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

- Frontend: http://unraid-ip:3000
- Backend API: http://unraid-ip:3001

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