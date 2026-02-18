# Telivra (T-Delivery) — Contexte projet

## Projet
Plateforme de livraison de repas full-stack avec suivi GPS temps réel, chat, VoIP.
- **Domaine** : t-delivery.com
- **Stack** : Next.js 16, React 19, TypeScript 5, Prisma 7, PostgreSQL (Neon), Socket.IO, PM2

## Accès VPS (Production)

### SSH
```
Host: 161.35.110.36
Port: 2215 (principal via bore.pub) | 2220 (fallback)
User: root
Password: GynecoTerrano2026
Cloudflare: gyneco.terrano-hosting.com
```

### Commandes de connexion
```bash
# Option 1 — bore.pub (principal)
sshpass -p 'GynecoTerrano2026' ssh -p 2215 -o StrictHostKeyChecking=no root@161.35.110.36

# Option 2 — Fallback
sshpass -p 'GynecoTerrano2026' ssh -p 2220 -o StrictHostKeyChecking=no root@161.35.110.36

# Option 3 — Cloudflare
sshpass -p 'GynecoTerrano2026' ssh -o StrictHostKeyChecking=no root@gyneco.terrano-hosting.com

# Avec SSH config (si configuré)
sshpass -p 'GynecoTerrano2026' ssh vps-telivra
```

### Installer sshpass si nécessaire
```bash
apt-get update -qq && apt-get install -y -qq openssh-client sshpass
```

## Architecture VPS
- **Projet existant** : Gyneco (port 3000)
- **Telivra** : port 3001
- **Nginx** : reverse proxy multi-sites
- **PM2** : process manager
- **App dir** : /root/t-delivery

## Déploiement
```bash
# Premier déploiement
bash deploy/deploy.sh

# Mise à jour
bash deploy/update.sh
```

## Commandes utiles sur le VPS
```bash
pm2 list                      # Voir les apps
pm2 logs t-delivery           # Logs
pm2 restart t-delivery        # Redémarrer
pm2 monit                     # Monitoring
nginx -t && systemctl reload nginx   # Reload Nginx
```
