#!/bin/bash
#SBATCH --job-name=clinical-deploy
#SBATCH --partition=pzero
#SBATCH --nodelist=own7
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --time=00:10:00
#SBATCH --output=/shared/subhankar_v0/deploy_%j.log

echo "=== Starting deployment on $(hostname) ==="
cd /shared/subhankar_v0

# Stop any existing containers with same names
docker compose down 2>/dev/null || true

# Build and start containers in detached mode
docker compose up --build -d

echo "=== Container status ==="
docker ps --filter name=clinical

echo "=== Deployment complete ==="
