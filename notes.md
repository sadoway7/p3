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