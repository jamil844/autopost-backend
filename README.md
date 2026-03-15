# ⚡ AutoPost Backend

Backend Node.js pour publier automatiquement des posts sur Twitter, LinkedIn et Instagram.

---

## 🗂️ Structure du projet

```
autopost-backend/
├── server.js          ← Point d'entrée, routes API
├── scheduler.js       ← Vérification et publication automatique
├── db.js              ← Base de données SQLite
├── publishers/
│   ├── twitter.js     ← Publication Twitter/X
│   ├── linkedin.js    ← Publication LinkedIn
│   └── instagram.js   ← Publication Instagram
├── package.json       ← Dépendances
├── .env.example       ← Template de configuration
└── README.md          ← Ce fichier
```

---

## 🚀 Installation

### 1. Installe les dépendances
```bash
npm install
```

### 2. Configure les variables d'environnement
```bash
cp .env.example .env
```
Ouvre `.env` et remplis tes clés API (voir section ci-dessous).

### 3. Lance le serveur
```bash
# En développement (redémarre automatiquement)
npm run dev

# En production
npm start
```

---

## 🔑 Obtenir les clés API

### Twitter/X
1. Va sur [developer.twitter.com](https://developer.twitter.com)
2. Crée une app → "Keys and Tokens"
3. Génère un "Access Token" avec permission **Read and Write**
4. Copie les 4 clés dans ton `.env`

### LinkedIn
1. Va sur [linkedin.com/developers](https://linkedin.com/developers)
2. Crée une app → onglet "Auth"
3. Génère un Access Token via OAuth 2.0
4. Ton `LINKEDIN_PERSON_ID` = ton ID LinkedIn (visible dans l'URL de ton profil)

### Instagram
1. Va sur [developers.facebook.com](https://developers.facebook.com)
2. Crée une app → ajoute le produit "Instagram Graph API"
3. Tu as besoin d'un **compte Instagram Business** obligatoirement

---

## 📡 API Routes

### Créer un post programmé
```bash
POST http://localhost:3000/posts

Body :
{
  "content": "Mon super post 🚀 #marketing",
  "platform": "twitter",
  "scheduled_at": "2025-03-20T14:30:00"
}
```

### Voir tous les posts
```bash
GET http://localhost:3000/posts
```

### Supprimer un post
```bash
DELETE http://localhost:3000/posts/1
```

### Vérifier le serveur
```bash
GET http://localhost:3000/health
```

---

## 🌍 Déployer en production

Pour que l'automatisation tourne 24h/24, déploie sur un serveur en ligne.

### Option 1 — Railway (le plus simple, gratuit pour commencer)
```bash
# Installe Railway CLI
npm install -g @railway/cli

# Connecte-toi
railway login

# Déploie
railway up
```
Puis ajoute tes variables d'environnement dans le dashboard Railway.

### Option 2 — Render
1. Va sur [render.com](https://render.com)
2. "New Web Service" → connecte ton repo GitHub
3. Build command : `npm install`
4. Start command : `node server.js`
5. Ajoute tes variables d'environnement dans "Environment"

### Option 3 — VPS OVH (~3€/mois)
```bash
# Sur ton VPS, installe Node.js puis :
npm install pm2 -g      # PM2 garde le process actif
pm2 start server.js     # Lance le serveur
pm2 save                # Sauvegarde pour redémarrage auto
```

---

## 💡 Exemple d'utilisation avec le frontend

Dans ton app React/frontend, appelle le backend ainsi :

```javascript
// Programmer un nouveau post
const response = await fetch('http://localhost:3000/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: "Mon post automatique ! 🚀",
    platform: "twitter",
    scheduled_at: "2025-03-20T14:30:00"
  })
});

const data = await response.json();
console.log(data.post); // Le post créé
```

---

## 💰 Vendre cet outil

Ce backend peut être vendu ou proposé en SaaS :
- **Vente one-shot** : 40€ - 80€ le code source sur Gumroad
- **SaaS mensuel** : 10€/mois par utilisateur avec hébergement inclus

---

Créé avec ❤️ — Stack : Node.js, Express, SQLite, node-cron
