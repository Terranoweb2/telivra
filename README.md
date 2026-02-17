# 🍽️ Telivra — Plateforme de livraison de repas

**Application complète de livraison de repas en temps réel** avec gestion de commandes, suivi GPS des livreurs, cuisine en direct, paiement mobile et chat intégré.

🌐 **Démo live** : [https://terranogps.thostplus.work](https://terranogps.thostplus.work)

---

## 📋 Fonctionnalités

### 🛒 Client
- Catalogue de repas avec recherche, catégories et photos
- Commande multi-étapes (extras, adresse, paiement)
- Suivi en temps réel du livreur sur carte interactive (Google Maps tiles)
- Système de notation (repas + livreur) après livraison
- Chat en direct avec le livreur
- Appel VoIP WebRTC intégré
- Dashboard personnel : commandes en cours, livrées, total dépensé
- Historique des commandes avec photos des plats

### 👨‍🍳 Cuisine
- Dashboard temps réel avec alertes sonores pour nouvelles commandes
- Onglets : Nouvelles / En cuisine / Prêtes / Livrées / Annulées
- Countdown de préparation par plat
- Confirmation de paiement = acceptation automatique
- Gestion des commandes espèces et en ligne

### 🚗 Livreur
- Liste des commandes prêtes à récupérer
- Navigation GPS avec itinéraire OSRM (routes principales + alternatives)
- Suivi de vitesse, distance restante, temps estimé
- Chat et appel VoIP avec le client
- Statut simplifié : accepter → en route → livrée
- Annulation avec motif obligatoire

### 👑 Admin
- Dashboard complet : recettes jour/semaine/mois, graphiques
- Stats cuisine : en attente, en préparation, prêtes, préparées
- Répartition paiements (espèces vs en ligne)
- Gestion produits, promotions, utilisateurs
- Brand-theme dynamique (couleur, titre navigateur, topbar)
- Encaissement et statistiques avancées

### 🎯 Système de promotions
- CRUD complet (création, modification, suppression)
- Pricing dynamique avec prix barrés
- Période de validité configurable
- Application automatique au panier

---

## 🏗️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | Next.js 16 (App Router) + React 19 + TypeScript |
| **UI** | Tailwind CSS 4 (thème dark natif) |
| **Base de données** | Neon PostgreSQL (serverless) |
| **ORM** | Prisma 7.3 |
| **Auth** | NextAuth.js v5 (credentials) |
| **Temps réel** | Socket.IO (WebSocket + polling) |
| **Cartes** | Leaflet + Google Maps tiles |
| **Routage GPS** | OSRM (Open Source Routing Machine) |
| **VoIP** | WebRTC peer-to-peer |
| **Optimisation** | Sharp (images), gzip, lazy loading, cache |
| **Déploiement** | VPS + Nginx + PM2 |

---

## 📁 Structure du projet

```
src/
├── app/
│   ├── (dashboard)/          # Pages authentifiées
│   │   ├── cuisine/          # Dashboard cuisinier
│   │   ├── dashboard/        # Dashboard (admin/client/livreur/cook)
│   │   ├── livraison/        # Commander, liste commandes, page livreur
│   │   ├── navigate/         # Navigation GPS livreur
│   │   ├── products/         # Gestion des produits (admin)
│   │   ├── settings/         # Paramètres (brand-theme, etc.)
│   │   ├── statistiques/     # Stats avancées
│   │   └── encaissement/     # Encaissement
│   ├── api/                  # API Routes
│   │   ├── orders/           # CRUD commandes + cook-accept, cancel, track
│   │   ├── deliveries/       # Livraisons + positions GPS
│   │   ├── products/         # Catalogue produits
│   │   ├── promotions/       # Système promotionnel
│   │   ├── messages/         # Chat en temps réel
│   │   ├── payments/         # Paiements MoMo
│   │   ├── stats/            # Statistiques et revenus
│   │   └── auth/             # Authentification
│   ├── track/[id]/           # Suivi commande (client connecté et non connecté)
│   └── page.tsx              # Landing page / catalogue public
├── components/
│   ├── map/                  # Composants cartographiques (Leaflet)
│   ├── chat/                 # Chat panel + bouton flottant
│   ├── call/                 # Overlay appel VoIP WebRTC
│   └── ui/                   # Composants réutilisables (cards, tabs, badges...)
├── hooks/                    # Hooks personnalisés
│   ├── use-chat.ts           # Chat temps réel
│   ├── use-call.ts           # Appels VoIP
│   ├── use-delivery-socket.ts # Socket livreur
│   └── use-socket.ts         # Socket générique
└── lib/                      # Utilitaires (prisma, auth, sons, pricing)
```

---

## 🗄️ Modèles de données

| Modèle | Description |
|--------|-------------|
| `User` | Utilisateurs (ADMIN, CLIENT, DRIVER, COOK, MANAGER, VIEWER) |
| `Product` | Produits avec catégories, images, temps de cuisson |
| `Order` | Commandes avec statuts (PENDING → PREPARING → READY → DELIVERING → DELIVERED) |
| `OrderItem` | Articles d'une commande |
| `Delivery` | Livraison assignée à un livreur avec positions GPS |
| `DeliveryPosition` | Historique des positions GPS du livreur |
| `Rating` | Notes client (repas + livreur + commentaires) |
| `Promotion` | Promotions avec période de validité |
| `SiteSettings` | Configuration du site (couleurs, titre, frais de livraison) |

---

## 🔐 Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| **ADMIN** | Tout : dashboard complet, produits, utilisateurs, promotions, stats |
| **COOK** | Dashboard cuisine, accepter/préparer commandes, confirmer paiements |
| **DRIVER** | Liste commandes prêtes, navigation GPS, livraison, chat/appel |
| **CLIENT** | Commander, suivre livraison, noter, chat/appel avec livreur |

---

## 🚀 Flux de commande

```
Client commande → PENDING
        ↓
Cuisine accepte (ou confirme paiement) → PREPARING
        ↓
Cuisine termine → READY
        ↓
Livreur accepte → DELIVERING (+ ordre PICKED_UP côté client)
        ↓
Livreur livre → DELIVERED
        ↓
Client note → Rating (repas + livreur)
```

---

## ⚡ Temps réel

- **Socket.IO** pour toutes les mises à jour en direct
- Nouvelles commandes : alerte sonore + notification cuisine
- Position livreur : mise à jour toutes les 5 secondes
- Chat : messages instantanés avec indicateur de saisie
- Statuts : synchronisation automatique entre tous les rôles

---

## 🎨 Thème

- Base **dark mode** nativement
- CSS inversion pour le mode light
- Brand-theme dynamique configurable par l'admin (couleur principale, titre)
- Toast adaptatif via `ThemedToaster` (Sonner)
- Pas de classes `dark:` Tailwind — approche CSS custom

---

## 📦 Installation

```bash
# Cloner le repo
git clone https://github.com/Terranoweb2/telivra.git
cd telivra

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Remplir DATABASE_URL, NEXTAUTH_SECRET, etc.

# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma db push

# Lancer en développement
npm run dev
```

---

## 📄 Licence

Projet privé — Tous droits réservés © 2026 Terrano
