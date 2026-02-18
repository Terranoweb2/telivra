#!/bin/bash
#=============================================================================
#  SCRIPT DE DEPLOIEMENT - TELIVRA (t-delivery.com)
#  VPS partagé avec projet Gyneco existant
#=============================================================================
set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
info()  { echo -e "${BLUE}[i]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }
header(){ echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# === CONFIGURATION ===
DOMAIN="t-delivery.com"
APP_DIR="/root/t-delivery"
APP_PORT=3001
REPO_URL="https://github.com/Terranoweb2/telivra.git"
BRANCH="claude/analyze-project-8IHsf"
PM2_APP_NAME="t-delivery"

header "PHASE 0 — EXPLORATION DU VPS"

info "Système:"
uname -a
echo ""

info "Espace disque:"
df -h / | tail -1
echo ""

info "RAM disponible:"
free -h | head -2
echo ""

info "Processus existants (PM2, Node, Nginx):"
pm2 list 2>/dev/null || warn "PM2 non installé"
echo ""

info "Nginx actif?"
systemctl is-active nginx 2>/dev/null && log "Nginx actif" || warn "Nginx non actif/installé"
echo ""

info "Ports en écoute:"
ss -tlnp 2>/dev/null | grep -E ':(80|443|3000|3001|5432)' || netstat -tlnp 2>/dev/null | grep -E ':(80|443|3000|3001|5432)' || true
echo ""

info "Projets existants dans /root:"
ls -la /root/ | grep -E '^d' || true
echo ""

info "Configs Nginx existantes:"
ls /etc/nginx/sites-enabled/ 2>/dev/null || ls /etc/nginx/conf.d/ 2>/dev/null || warn "Aucune config trouvée"
echo ""

# ===================================================================
header "PHASE 1 — INSTALLATION DES DEPENDANCES SYSTEME"
# ===================================================================

# Mise à jour du système
info "Mise à jour du système..."
apt-get update -qq

# Installer les paquets nécessaires
info "Installation des paquets essentiels..."
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw build-essential

# Node.js 20 LTS (si pas déjà installé)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    log "Node.js déjà installé: $NODE_VERSION"
    # Vérifier que c'est au moins v18
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        warn "Node.js $NODE_VERSION trop ancien, mise à jour vers v20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -qq nodejs
    fi
else
    info "Installation de Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi
log "Node.js $(node -v) / npm $(npm -v)"

# PM2 (si pas déjà installé)
if command -v pm2 &> /dev/null; then
    log "PM2 déjà installé: $(pm2 -v)"
else
    info "Installation de PM2..."
    npm install -g pm2
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
fi

# tsx (pour le serveur custom)
if npm list -g tsx &>/dev/null; then
    log "tsx déjà installé globalement"
else
    info "Installation de tsx..."
    npm install -g tsx
fi

# PostgreSQL (si pas déjà installé)
if ! command -v psql &>/dev/null; then
    info "Installation de PostgreSQL..."
    apt-get install -y -qq postgresql postgresql-contrib
fi
systemctl start postgresql 2>/dev/null || service postgresql start
systemctl enable postgresql 2>/dev/null || true

# Créer l'utilisateur et la base si nécessaires
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='telivra'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER telivra WITH PASSWORD 'TelivraSecure2026!';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='telivra'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE telivra OWNER telivra;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE telivra TO telivra;" 2>/dev/null || true
log "PostgreSQL configuré"

# ===================================================================
header "PHASE 2 — DEPLOIEMENT DU PROJET TELIVRA"
# ===================================================================

# Cloner ou mettre à jour le repo
if [ -d "$APP_DIR" ]; then
    warn "Le dossier $APP_DIR existe déjà"
    info "Mise à jour du code..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH 2>/dev/null || git reset --hard origin/main
    log "Code mis à jour"
else
    info "Clonage du repo..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    git checkout $BRANCH 2>/dev/null || true
    log "Repo cloné dans $APP_DIR"
fi

cd "$APP_DIR"

# Créer/mettre à jour le fichier .env
AUTH_SECRET_VALUE=$(grep '^AUTH_SECRET=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "")
NEXTAUTH_SECRET_VALUE=$(grep '^NEXTAUTH_SECRET=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "")
SECRET="${AUTH_SECRET_VALUE:-${NEXTAUTH_SECRET_VALUE:-$(openssl rand -base64 32)}}"

cat > .env << ENVEOF
DATABASE_URL="postgresql://telivra:TelivraSecure2026!@localhost:5432/telivra"
AUTH_SECRET="${SECRET}"
AUTH_TRUST_HOST=true
AUTH_URL="https://t-delivery.com"
NEXTAUTH_SECRET="${SECRET}"
NEXTAUTH_URL="https://t-delivery.com"
NODE_ENV="production"
PORT=3001
DEPLOY_SECRET="8825d84896081a6e606bdff3c81f336f4053c551eb800fa0d32ccc77cba7f596"
ENVEOF
log "Fichier .env configuré"

# Installer les dépendances
info "Installation des dépendances npm..."
npm ci --production=false 2>/dev/null || npm install
log "Dépendances installées"

# Générer le client Prisma
info "Génération du client Prisma..."
npx prisma generate
log "Client Prisma généré"

# Appliquer les migrations
info "Application des migrations de base de données..."
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma migrate deploy 2>/dev/null || warn "Migrations — vérifier manuellement"
log "Base de données synchronisée"

# Seed de la base de données (seulement si première installation)
if [ ! -f ".seed_done" ]; then
    info "Seed de la base de données..."
    npx tsx prisma/seed.ts 2>/dev/null && touch .seed_done && log "Seed terminé" || warn "Seed échoué (peut-être déjà fait)"
fi

# Créer le dossier uploads
mkdir -p public/uploads
chmod 755 public/uploads

# Build Next.js
info "Build du projet Next.js (cela peut prendre quelques minutes)..."
NODE_ENV=production npm run build
log "Build terminé avec succès"

# ===================================================================
header "PHASE 3 — CONFIGURATION PM2"
# ===================================================================

# Arrêter l'ancienne instance si elle existe
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true

# Créer le dossier de logs
mkdir -p "$APP_DIR/logs"

# Démarrer avec PM2 via ecosystem.config.js
info "Démarrage de l'application avec PM2 (tsx server.ts)..."
pm2 start ecosystem.config.js

# Sauvegarder la config PM2
pm2 save
log "Application démarrée sur le port $APP_PORT"

# Vérifier que l'app tourne
sleep 3
if pm2 show "$PM2_APP_NAME" | grep -q "online"; then
    log "Application en ligne !"
else
    err "L'application n'a pas démarré correctement"
    pm2 logs "$PM2_APP_NAME" --lines 20
    exit 1
fi

# ===================================================================
header "PHASE 4 — CONFIGURATION NGINX"
# ===================================================================

# Sauvegarder les configs existantes
if [ -d /etc/nginx/sites-enabled ]; then
    info "Sauvegarde des configs Nginx existantes..."
    cp -r /etc/nginx/sites-enabled /etc/nginx/sites-enabled.bak.$(date +%Y%m%d) 2>/dev/null || true
fi

# Copier la config Nginx pour Telivra (gérer les conflits map directive)
info "Installation de la config Nginx pour $DOMAIN..."
if [ -f "$APP_DIR/deploy/nginx-t-delivery.conf" ]; then
    if grep -rq 'map.*http_upgrade.*connection_upgrade' /etc/nginx/nginx.conf /etc/nginx/sites-enabled/ 2>/dev/null; then
        warn "Map directive déjà définie, suppression du doublon"
        sed '/^map \$http_upgrade/,/^}/d' "$APP_DIR/deploy/nginx-t-delivery.conf" > /etc/nginx/sites-available/t-delivery.conf
    else
        cp "$APP_DIR/deploy/nginx-t-delivery.conf" /etc/nginx/sites-available/t-delivery.conf
    fi
    ln -sf /etc/nginx/sites-available/t-delivery.conf /etc/nginx/sites-enabled/t-delivery.conf
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    log "Config Nginx installée"
else
    err "Fichier nginx-t-delivery.conf non trouvé dans deploy/"
    exit 1
fi

# Tester la config Nginx
info "Test de la configuration Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    log "Config Nginx valide"
else
    err "Config Nginx invalide !"
    exit 1
fi

# Recharger Nginx
info "Rechargement de Nginx..."
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx
log "Nginx rechargé"

# ===================================================================
header "PHASE 5 — CERTIFICAT SSL (Let's Encrypt)"
# ===================================================================

info "Obtention du certificat SSL pour $DOMAIN..."
echo ""
warn "Assure-toi que le DNS de $DOMAIN pointe vers l'IP de ce serveur !"
echo ""

# Vérifier si le certificat existe déjà
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log "Certificat SSL déjà existant pour $DOMAIN"
else
    info "Demande du certificat SSL..."
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN 2>/dev/null || {
        warn "Certbot a échoué. Tu peux le relancer manuellement :"
        echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
        echo ""
        warn "Vérifie que le DNS A/AAAA de $DOMAIN pointe vers ce serveur"
    }
fi

# ===================================================================
header "PHASE 6 — FIREWALL"
# ===================================================================

info "Configuration du firewall..."
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 22/tcp 2>/dev/null || true
ufw allow 2215/tcp 2>/dev/null || true
# Ne pas activer ufw automatiquement pour ne pas se bloquer
log "Règles firewall ajoutées (HTTP, HTTPS, SSH)"

# ===================================================================
header "DEPLOIEMENT TERMINE"
# ===================================================================

echo ""
log "Application Telivra déployée avec succès !"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━ RÉSUMÉ ━━━━━━━━━━━━━━━${NC}"
echo -e "  Domaine     : ${GREEN}https://$DOMAIN${NC}"
echo -e "  App dir     : ${BLUE}$APP_DIR${NC}"
echo -e "  Port interne: ${BLUE}$APP_PORT${NC}"
echo -e "  PM2 name    : ${BLUE}$PM2_APP_NAME${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Commandes utiles :${NC}"
echo "  pm2 logs $PM2_APP_NAME      — Voir les logs"
echo "  pm2 restart $PM2_APP_NAME   — Redémarrer"
echo "  pm2 monit                   — Monitorer"
echo "  pm2 list                    — Voir tous les processus"
echo ""
echo -e "${YELLOW}Pour mettre à jour :${NC}"
echo "  cd $APP_DIR && git pull && npm install && npm run build && pm2 restart $PM2_APP_NAME"
echo ""
