# ⚽ ai-trick — Gestion Équipe Junior Hattrick

Outil d'aide à la gestion d'équipe junior Hattrick, propulsé par l'IA (Claude).
Données persistantes via Cloudflare D1.

## Fonctionnalités

- **Import HRF** : Parse les fichiers Hattrick Organizer
- **Import Rapports** : Rapport entraîneur, compte-rendu, notes détaillées
- **Tableau des joueurs** : Vue compact + détail avec barres de progression
- **Composition IA** : Compo optimisée pour la progression (pas pour gagner !)
- **Recrutement IA** : Analyse des 3 profils scouts hebdomadaires
- **Promotions IA** : Recommandations de promotion senior
- **Licenciements IA** : Suggestions si effectif > 14
- **Plan B** : Alternative avec possibilité d'expliquer le refus
- **Notes personnalisées** : Enrichir le prompt IA avec tes règles

## Déploiement

### Prérequis
- Compte Cloudflare + Wrangler CLI (`npm i -g wrangler`)
- Repo GitHub
- Node.js 18+

### Étapes

1. **Créer le repo GitHub** :
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TON_USER/ai-trick.git
git push -u origin main
```

2. **Créer la base D1** :
```bash
wrangler d1 create ai-trick-db
```
Copie le `database_id` retourné dans `wrangler.toml`.

3. **Exécuter la migration** :
```bash
wrangler d1 execute ai-trick-db --remote --file=migrations/0001_init.sql
```

4. **Connecter à Cloudflare Pages** :
   - https://dash.cloudflare.com → Pages → Create a project
   - Connecte le repo GitHub
   - Build command : `npm install && npm run build`
   - Build output directory : `dist`
   - **D1 binding** : dans Settings > Functions > D1 database bindings :
     - Variable name : `DB`
     - D1 database : `ai-trick-db`
   - Deploy !

5. **Configurer l'app** :
   - Ouvre l'URL déployée
   - Paramètres → entre ta clé API Anthropic
   - Importe ton fichier HRF → c'est parti !

### Développement local

```bash
npm install
npm run dev
```

Pour tester avec D1 local :
```bash
wrangler d1 execute ai-trick-db --local --file=migrations/0001_init.sql
npx wrangler pages dev dist
```

## Structure

```
├── functions/api/
│   ├── chat.js        # Proxy API Anthropic
│   ├── hrf.js         # CRUD données HRF (D1)
│   ├── reports.js     # CRUD rapports de match (D1)
│   └── settings.js    # CRUD paramètres (D1)
├── migrations/
│   └── 0001_init.sql  # Schéma DB
├── src/
│   ├── components/    # 8 composants React
│   ├── data/          # Prompt système IA
│   ├── utils/         # Parser HRF, service IA, storage
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── wrangler.toml
└── package.json
```
