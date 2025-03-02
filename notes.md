# Development Notes

## esbuild error fix

If you encounter the following error when running `npm run dev`:

```
Error: The package "@esbuild/win32-x64" could not be found, and is needed by esbuild.
```

Run the following command to install the missing package:

```
npm install @esbuild/win32-x64
```

## Docker Deployment Troubleshooting

### Problem
In development environment everything works fine. But when deployed in Docker:
- Frontend starts correctly
- Backend connects to remote database correctly
- Frontend and backend cannot communicate with each other

### Diagnosed Issues
1. **Backend Server Binding**
   - In `backend/index.js`, the server binds to `localhost` instead of `0.0.0.0`
   - In Docker, this prevents connections from outside the container

2. **CORS Configuration**
   - Default CORS settings don't specify allowed origins for production
   - May be blocking legitimate cross-container requests

3. **API Endpoint Configuration**
   - Multiple competing configurations:
     - `apiUtils.ts`: Uses hostname-based URL `http://${window.location.hostname}:3001`
     - Environment: `VITE_API_BASE_URL=/api` vs `VITE_API_BASE_URL=http://localhost:3001`
     - Vite proxy: Different targets in dev vs preview mode

4. **Docker Network Configuration**
   - Using `network_mode: "host"` with custom network definition
   - Port binding `127.0.0.1:3001:3001` limits backend to localhost only

### Solutions

1. **Use the debug tools** to identify connection issues:
   ```
   # Start debug backend server
   node backend/debug-server.js
   
   # View the debug UI
   # Access http://localhost:3000/debug in browser after starting frontend
   ```

2. **Fix backend binding** by using the improved server file:
   ```
   # Update Dockerfile or start script to use:
   node backend/index-docker-fix.js
   ```

3. **Review docker-compose.yml settings**:
   - Change port binding from `127.0.0.1:3001:3001` to `3001:3001`
   - Remove `network_mode: "host"` if using the defined app_network
   - Ensure environment variables are correct:
     ```yaml
     environment:
       - VITE_API_BASE_URL=/api
       - HOST=0.0.0.0
       - PORT=3001
     ```

4. **Browser network troubleshooting**:
   - Open browser console when deployed 
   - Check for CORS errors and failed network requests
   - The debug page at `/debug` will test all API connection methods

## Nginx Proxy Manager Configuration

If you're using Nginx Proxy Manager with Docker, it adds another layer that needs proper configuration:

### Option 1: Single Domain with Path-Based Routing (Recommended)

1. **Create a proxy host entry** for your main domain (e.g., rumfor.com)
   - Forward to your Docker container on port 3000 (frontend)
   - Enable WebSockets Support if needed

2. **Add advanced configuration** with custom locations:
   ```nginx
   # Handle API requests - forward to backend
   location /api/ {
       # For Docker, use container name (rumfor-app) or internal Docker IP
       # When using Nginx Proxy Manager with your domain (rumfor.com),
       # you don't need to use public IP addresses
       proxy_pass http://rumfor-app:3001/api/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       
       # CORS headers for API
       add_header 'Access-Control-Allow-Origin' '*' always;
       add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
       add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Content-Type' always;
       
       # Handle preflight requests
       if ($request_method = 'OPTIONS') {
           add_header 'Access-Control-Allow-Origin' '*' always;
           add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
           add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Content-Type' always;
           add_header 'Content-Type' 'text/plain charset=UTF-8';
           add_header 'Content-Length' 0;
           return 204;
       }
   }
   
   # Handle all other requests - forward to frontend
   location / {
       # For Docker, use container name (rumfor-app) or internal Docker IP
       proxy_pass http://rumfor-app:3000/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
   
3. **Update docker-compose.yml**:
   - Make sure both ports 3000 and 3001 are exposed (not limited to 127.0.0.1)
   - Set `VITE_API_BASE_URL=/api` in the environment

### Option 2: Separate Domains for API and Frontend

1. **Create two proxy host entries**:
   - Main domain (e.g., rumfor.com) forwarding to port 3000 (frontend)
   - API subdomain (e.g., api.rumfor.com) forwarding to port 3001 (backend)

2. **Add CORS headers** to the API subdomain's advanced configuration:
   ```nginx
   add_header 'Access-Control-Allow-Origin' 'https://rumfor.com' always;
   add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
   add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Content-Type' always;
   
   if ($request_method = 'OPTIONS') {
       add_header 'Access-Control-Allow-Origin' 'https://rumfor.com' always;
       add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
       add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Content-Type' always;
       add_header 'Content-Type' 'text/plain charset=UTF-8';
       add_header 'Content-Length' 0;
       return 204;
   }
   ```

3. **Update frontend configuration**:
   - Set `VITE_API_BASE_URL=https://api.rumfor.com` in docker-compose.yml

### Docker Networking and Nginx Notes

1. **About Container References**:
   - When using Nginx Proxy Manager with Docker, you don't need to use IP addresses
   - You can use the Docker container name (e.g., `rumfor-app`) directly
   - Container names work as hostnames in Docker networks

2. **Docker Networking Tips**:
   - If using named networks, ensure all containers are on the same network
   - Example docker-compose network definition:
     ```yaml
     services:
       rumfor-app:
         # ...container config...
         networks:
           - app_network
     
     networks:
       app_network:
         external: true  # If you want to use the same network as Nginx Proxy Manager
     ```

### Troubleshooting Nginx Proxy Manager

1. **Check proxy host logs** in Nginx Proxy Manager UI
2. **Verify Docker network connections**:
   ```bash
   # Check which networks your container is connected to
   docker inspect rumfor-app -f '{{json .NetworkSettings.Networks}}'
   
   # Get container IP address if needed
   docker inspect rumfor-app | grep "IPAddress"
   ```
3. **Test raw connections** to your Docker containers:
   ```bash
   # Test backend API directly (from Docker host)
   curl http://localhost:3001/api/test
   
   # Or use Docker container name if you're inside Docker network
   curl http://rumfor-app:3001/api/test
   ```
4. **Use the debug page** at `/debug` to test various connection methods