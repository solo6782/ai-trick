# Changelog

Toutes les modifications notables de **ai-trick** sont documentées ici.

## [0.4.1] - 2026-03-13

### Corrigé
- **Rapports dans fiche joueur** : n'affiche plus que les phrases du rapport coach mentionnant le joueur (plus de compte-rendu ni de rapport complet)

### Ajouté
- **Numéro de version** affiché dans le header (à côté du logo) et dans la page Paramètres
- Fichier `src/version.js` centralisant le numéro de version

## [0.4.0] - 2026-03-13

### Corrigé
- **Bug critique** : l'API `/api/history` ne recevait pas les données (clé `records` vs `entries`)
- **Bug** : référence à `showImportHistory` non définie qui cassait l'app
- **Bug** : les rapports de match affichaient tous les rapports dans la fiche joueur au lieu de filtrer par joueur

### Amélioré
- Import en masse chunké (envoi par paquets de 200 pour éviter les timeouts)
- Rafraîchissement automatique de l'historique après import en masse
- Nettoyage des fonctions dupliquées dans storage.js

## [0.3.0] - 2026-03-13

### Ajouté
- **Score de potentiel** (0-100) calculé automatiquement pour chaque joueur, colonne triable
- **Prédictions IA** : bouton "Analyser" qui estime les compétences inconnues (affichées avec `~` en cyan)
- **Import HRF historique en masse** : sélection multiple de fichiers, extraction des notes individuelles
- **Historique des matchs** par joueur dans le panneau de détail (poste, minutes, étoiles)
- Table D1 `ai_predictions` pour stocker les prédictions
- Table D1 `player_match_history` pour stocker l'historique des notes

## [0.2.0] - 2026-03-13

### Ajouté
- **Onglet Rapports** : liste des matchs importés avec lecture, modification et suppression
- Endpoint API DELETE pour les rapports
- Passage au stockage **Cloudflare D1** (base de données persistante)
- Renommage du projet en **ai-trick**

### Changé
- Toutes les données stockées en D1 au lieu de localStorage
- Toutes les fonctions de stockage sont asynchrones

## [0.1.0] - 2026-03-13

### Ajouté
- Import et parsing de fichiers HRF (Hattrick Organizer)
- Tableau compact des joueurs jeunes avec compétences (actuel/max)
- Panneau de détail joueur avec barres de progression
- Commentaires du recruteur (scout) dans le détail
- Import de rapports de match (3 champs : rapport, compte-rendu, notes détaillées)
- **Composition IA** : proposition de compo + entraînement avec justifications
- **Plan B** : alternative avec champ texte optionnel pour expliquer le refus
- **Recrutement IA** : analyse des 3 profils scouts hebdomadaires
- **Promotions IA** : recommandations sur la page d'accueil
- **Licenciements IA** : suggestions si effectif > 14 joueurs
- Page Paramètres : clé API Anthropic + notes complémentaires pour le prompt
- Prompt système complet intégrant les règles Hattrick (postes, formules, spécialités, entraînement junior, commentaires coach)
- Dark mode
- Proxy Cloudflare Pages Function pour l'API Anthropic
