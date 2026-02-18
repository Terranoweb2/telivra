#!/bin/bash
#=============================================================================
#  SCRIPT DE MISE A JOUR RAPIDE — TELIVRA (t-delivery.com)
#  Usage: bash /root/t-delivery/deploy/update.sh
#=============================================================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/root/t-delivery"
PM2_APP_NAME="t-delivery"

echo -e "${BLUE}[i]${NC} Mise à jour de Telivra..."

cd "$APP_DIR"

# Pull des derniers changements
echo -e "${BLUE}[i]${NC} Pull du code..."
git pull origin main

# Installer les nouvelles dépendances
echo -e "${BLUE}[i]${NC} Installation des dépendances..."
npm ci --production=false 2>/dev/null || npm install

# Regénérer Prisma si le schema a changé
echo -e "${BLUE}[i]${NC} Génération Prisma..."
npx prisma generate
npx prisma db push --accept-data-loss 2>/dev/null || true

# Rebuild
echo -e "${BLUE}[i]${NC} Build Next.js..."
NODE_ENV=production npm run build

# Redémarrer PM2
echo -e "${BLUE}[i]${NC} Redémarrage PM2..."
pm2 restart "$PM2_APP_NAME"

sleep 2
pm2 show "$PM2_APP_NAME" | grep status

echo -e "${GREEN}[✓]${NC} Mise à jour terminée !"
echo -e "${GREEN}[✓]${NC} Site: https://t-delivery.com"
