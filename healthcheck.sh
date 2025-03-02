#!/bin/bash

echo "============ DOCKER HEALTHCHECK ============"
echo "Date: $(date)"
echo ""

echo "--- Network Interfaces ---"
ip addr show
echo ""

echo "--- Listening Ports ---"
netstat -tuln
echo ""

echo "--- Process Status ---"
ps aux | grep node
echo ""

echo "--- Testing Backend Connection ---"
curl -v http://localhost:3001/ || echo "Could not connect to backend on localhost:3001"
echo ""

echo "--- Container Hostname ---"
hostname
echo ""

echo "--- Host IP Resolution ---"
hostname -i
echo ""

echo "--- DNS Resolution ---"
cat /etc/hosts
echo ""

echo "--- Backend Logs ---"
if [ -f /app/backend.log ]; then
  tail -n 50 /app/backend.log
else
  echo "No backend log file found"
fi
echo ""

echo "============================================"