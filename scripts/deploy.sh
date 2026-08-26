#!/usr/bin/env bash
# ==============================================================================
# HOSTEL EASE — PRODUCTION SERVER DEPLOYMENT SCRIPT
# ==============================================================================
# Usage on Production VPS:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh

set -euo pipefail

echo "================================================================="
echo "🚀 HOSTEL EASE PRODUCTION DEPLOYMENT STARTING"
echo "================================================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "📂 Working directory: $APP_DIR"

# 1. Ensure Persistent Directories Exist
mkdir -p data uploads logs backups

# 2. Check for Production .env
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update /var/www/hostel-ease/.env with your production secrets!"
fi

# 3. Create Pre-Deployment Safety Snapshot of SQLite Database
if [ -f "data/hostel_ease.db" ]; then
    echo "💾 Creating pre-deployment database safety snapshot..."
    cp data/hostel_ease.db "data/hostel_ease.db.pre-deploy-$(date +%Y%m%d_%H%M%S)"
fi

# 4. Fetch and update code from GitHub (Preserving untracked data/ & uploads/)
echo "⬇️  Pulling latest commits from GitHub origin/main..."
git fetch origin main
git checkout main
git merge origin/main --ff-only || (echo "⚠️ Fast-forward merge failed; resetting tracked files to origin/main" && git reset --hard origin/main)

# 5. Install clean dependencies
echo "📦 Installing clean npm dependencies..."
npm ci

# 6. Build production frontend (TypeScript + Vite)
echo "⚡ Building frontend distribution..."
npm run build

# 7. Run safe, idempotent database migrations
echo "🗄️  Running database migrations (idempotent DDL)..."
npm run db:migrate

# 8. Reload PM2 Process Manager
echo "🔄 Reloading PM2 process (Zero-Downtime)..."
pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production
pm2 save

# 9. Verify Health Check
echo "🔍 Verifying application health..."
sleep 3
if curl -sf http://127.0.0.1:5000/api/health > /dev/null; then
    echo "================================================================="
    echo "✅ DEPLOYMENT COMPLETE: Hostel Ease is live and healthy 24/7!"
    echo "================================================================="
else
    echo "❌ ERROR: Health check failed on http://127.0.0.1:5000/api/health"
    pm2 logs hostel-ease --lines 20 --nostream
    exit 1
fi
