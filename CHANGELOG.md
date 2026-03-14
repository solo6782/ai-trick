# Changelog

Toutes les modifications notables de **ai-trick** sont documentées ici.

## [0.9.1] - 2026-03-14

### Corrigé
- **Bug critique JSON invalide** : `max_tokens` était à 4096 — largement insuffisant pour 14 joueurs avec classifications. Passé à 16384.
- **API version** mise à jour de `2023-06-01` à `2024-10-22` pour compatibilité Opus 4.6.
- **Parsing JSON robuste** : gère les cas où Opus ajoute du texte avant/après le JSON, les blocs ``` avec ou sans tag json, le JSON tronqué (tente de refermer les crochets/accolades).
- Meilleurs messages d'erreur en cas d'échec API.

## [0.9.0] - 2026-03-14

### Refonte majeure : Analyse en 2 étapes
- **Bouton "Analyser"** fait maintenant DEUX choses : prédire les compétences inconnues ET classifier chaque joueur (STAR/PROSPECT/MYSTÈRE/GOLFEUR/INUTILE) avec justification, poste naturel détecté, et compétences manquantes. Tout est sauvegardé en D1.
- **Bouton "Composition"** s'appuie sur les classifications pré-calculées. L'IA n'a plus à tout analyser d'un coup — elle reçoit les catégories et n'a qu'à placer les joueurs. Résultat bien meilleur.
- **Avertissement** si on lance la composition sans avoir fait l'analyse d'abord.

### Ajouté
- **Badges de catégorie** dans le tableau de bord (S=Star, P=Prospect, ?=Mystère, G=Golfeur, I=Inutile) à côté du nom
- **Catégorie + justification** dans la fiche joueur détaillée (poste naturel, compétences à découvrir)
- Passage à Claude Opus 4.6 (v0.8.0)
- Classification obligatoire avant compo (v0.8.0)
- Composition persistante et noms cliquables (v0.8.0)

## [0.8.0] - 2026-03-14

### Changement majeur
- **Passage à Claude Opus 4.6** — Meilleur raisonnement, meilleur respect des règles complexes. Légèrement plus lent (~20s) mais nettement plus intelligent.

### Ajouté
- **Classification obligatoire** : avant chaque composition, l'IA doit classer CHAQUE joueur (STAR/PROSPECT/MYSTÈRE/GOLFEUR/INUTILE) avec justification chiffrée. La classification est affichée en haut de la compo avec un code couleur.
- **Vérification intégrée** : si un GOLFEUR apparaît en poste entraînable ou un MYSTÈRE sur le banc, l'IA doit corriger.
- **Composition persistante** : la dernière compo est sauvegardée en D1, elle est restaurée à l'ouverture.
- **Noms cliquables** : dans la compo, cliquer sur un nom de joueur affiche une mini-fiche avec ses compétences.
- Bouton "Recalculer" pour relancer sans fermer la modale.

## [0.7.1] - 2026-03-14

### Corrigé
- **Bug critique** : les mystères (jeunes 15 ans) étaient systématiquement mis sur le banc au lieu de jouer
- Refonte complète de l'algorithme de placement : l'IA doit d'abord compter et classer tous les joueurs, puis réserver les places dans l'ordre Stars → Mystères → Golfeurs → Inutiles sur le banc
- Règle explicite : un mystère NE VA JAMAIS sur le banc tant qu'il reste un joueur moins utile dans le 11
- Les golfeurs DOIVENT jouer (en postes morts) car leur présence force le moteur à révéler les compétences des bons joueurs
- Seuls les joueurs "inutiles" (quasi promus maxés, blessés, à virer) vont sur le banc

## [0.7.0] - 2026-03-14

### Refonte majeure du prompt système
- **Guide académie intégré** : jeu créatif obligatoire, ordres individuels (milieux défensifs pour révéler costaud, joueurs révélés vers le milieu), substitution à la 89e, malus 20% si même entraînement primaire/secondaire
- **Classification des joueurs** : 3 catégories claires — Stars/Prospects (à entraîner), Mystères (à explorer en priorité), Golfeurs (bouche-trous utiles en postes morts)
- **Golfeurs INTERDITS en poste entraînable** — Un Buteur 5/7 + Passe 2 MAXÉ = golfeur, va en gardien/défense
- **Mystères TOUJOURS alignés** — Les jeunes de 15 ans avec peu de compétences révélées jouent systématiquement, même à un poste non entraînable, pour découvrir leur profil
- **Grille de valeur des joueurs** : somme des 3 meilleures compétences (médiocre 13-18, faible 19-24, inadéquat 25-30, passable 31-36, honorable 37-42)
- **Ordres individuels dans la compo** : Normal, Défensif, Offensif, Vers le centre affichés pour chaque joueur
- **Substitutions à la 89e** dans la compo pour tester un mystère dans un nouveau poste
- **Tactique affichée** dans le panneau de composition

## [0.6.3] - 2026-03-13

### Amélioré
- **Terrain retourné** : gardien en haut, attaquants en bas (comme sur Hattrick)
- **Prompt : table explicite des combos formation/entraînement** — Pour chaque combinaison primaire+secondaire, la formation optimale est précisée (ex: Construction+Passe → 2-5-3). Règle : minimiser les postes "morts" qui ne reçoivent ni le primaire ni le secondaire.

## [0.6.2] - 2026-03-13

### Amélioré
- **Prompt : Triangle d'analyse** — L'IA croise maintenant 3 sources pour déterminer le profil d'un joueur : compétences HRF + historique des notes par poste + phrases du coach/scout.
- Un joueur qui fait 1★ à un poste depuis 16 matchs ne sera plus remis à ce poste. Les notes historiques servent d'indice, pas de vérité.
- Les phrases du coach ("peut atteindre honorable en Ailier", "ne progressera plus en Construction") sont prises en compte pour la déduction du profil.
- Exemple explicite dans le prompt : Lanoy (Ailier 6/7, Imprévisible, 1★ en gardien) = ailier, pas gardien.

## [0.6.1] - 2026-03-13

### Amélioré
- **Prompt : évaluation profil complet** — L'IA évalue maintenant les compétences secondaires du poste. Un Buteur 7 avec Passe 2 MAXÉ est traité comme un bouche-trou, pas un prospect.
- **Prompt : formation optimisée** — La formation maximise les postes entraînables. Buteur + Construction → 2-5-3 (8 joueurs entraînés) au lieu de 3-4-3 (7 joueurs).
- **Prompt : classement revu** — Les STARS doivent avoir un max 7+ ET des compétences secondaires correctes. Les joueurs unidimensionnels sont des bouche-trous.
- Ajout d'exemples explicites de bonnes/mauvaises décisions dans le prompt.

## [0.6.0] - 2026-03-13

### Amélioré
- **Prompt système refondu** : règles de composition avec 5 niveaux de priorité. L'IA ne mettra plus un ailier en gardien pour "révéler" une compétence inutile. Progression > Révélation. Les derniers matchs avant promotion sont protégés.
- **Composition graphique** : affichage sur un terrain de football (style Hattrick) avec les joueurs positionnés par ligne, formation visible, remplaçants en dessous.
- **Réponse structurée** : l'IA retourne un JSON parsé automatiquement — entraînements en blocs colorés, pitch graphique, justifications par joueur, résumé stratégique.
- Fallback texte si le JSON n'est pas parsable.

## [0.5.0] - 2026-03-13

### Ajouté
- **Tri sur toutes les colonnes** du tableau de bord, y compris les 7 compétences (GK, DEF, CON, AIL, PAS, BUT, CF)
- **Analyses repliables** : clic sur le titre pour replier/déplier les analyses Promotions et Licenciements
- **Analyses persistantes** : les résultats sont sauvegardés en D1, ils survivent à un changement de page ou un rechargement
- Bouton "Relancer l'analyse" visible quand une analyse est dépliée

## [0.4.3] - 2026-03-13

### Corrigé
- **Tri chronologique** : les rapports et l'historique des matchs sont maintenant triés du plus récent au plus ancien
- **Import rapport** : plus de `custom_` comme ID — un champ de saisie manuelle de l'ID du match est disponible

### Amélioré
- **Historique joueur** : les phrases du rapport coach apparaissent directement sous le match concerné (au lieu d'une section séparée)
- **Import rapport** : deux modes (sélection d'un match connu ou saisie manuelle ID + date)

## [0.4.2] - 2026-03-13

### Corrigé
- **Dates au format européen** : les dates DD-MM-YYYY et DD/MM/YYYY sont maintenant correctement interprétées (plus de confusion mois/jour)
- Toutes les dates de l'app utilisent le nouveau parser centralisé `formatDateFR`

### Ajouté
- **Changelog cliquable** : clic sur le numéro de version dans le header pour voir l'historique des changements
- Composant `ChangelogModal` avec rendu formaté du changelog

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
