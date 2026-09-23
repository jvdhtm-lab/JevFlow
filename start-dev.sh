#!/bin/bash
set -e

echo "=== Starting JevFlow stack ==="
docker-compose up -d --build

echo "=== Waiting for Django to be healthy ==="
until curl -sf http://localhost:8081/swagger.json > /dev/null; do
    echo "Waiting for Django..."
    sleep 2
done

echo "=== Done ==="
echo "Django API : http://localhost:8081/swagger/"
echo "Proxy (app): http://localhost:4001"
echo "Frontend   : http://localhost:5174 (npm run dev in JevFlow-frontend/apps/trampoline)"
echo "Login      : root@local.com / admin"
