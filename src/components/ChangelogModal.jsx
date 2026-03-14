import { useState, useEffect } from 'react'

const CHANGELOG = `## [0.9.0] - 2026-03-14

### Refonte : Analyse en 2 étapes
- Bouton Analyser = prédictions + classification (STAR/PROSPECT/MYSTÈRE/GOLFEUR/INUTILE)
- Bouton Composition s'appuie sur les classifications pré-calculées
- Badges de catégorie dans le tableau et la fiche joueur
- Poste naturel détecté et compétences à découvrir affichés
- Avertissement si compo lancée sans analyse

## [0.8.0] - 2026-03-14

### Changement majeur
- Passage à Claude Opus 4.6 (meilleur raisonnement, ~20s par analyse)

### Ajouté
- Classification obligatoire avant chaque compo (STAR/PROSPECT/MYSTÈRE/GOLFEUR/INUTILE)
- Vérification : GOLFEUR en poste entraînable ou MYSTÈRE sur banc = erreur corrigée
- Composition persistante (sauvegardée en D1)
- Noms cliquables → mini-fiche joueur
- Bouton "Recalculer"

## [0.7.1] - 2026-03-14

### Corrigé
- Bug critique : mystères (15 ans) systématiquement mis sur le banc
- Algorithme de placement refondu : compter, classer, puis réserver les places
- Mystère JAMAIS sur le banc tant qu'un joueur moins utile est aligné
- Golfeurs DOIVENT jouer (forcent les révélations)
- Seuls les "inutiles" (promus maxés, blessés) vont sur le banc

## [0.7.0] - 2026-03-14

### Refonte majeure du prompt
- Guide académie intégré (jeu créatif, ordres individuels, sub 89e, malus même entraînement)
- 3 catégories de joueurs : Stars/Prospects, Mystères (TOUJOURS alignés), Golfeurs (postes morts UNIQUEMENT)
- Grille de valeur : somme des 3 meilleures compétences
- Ordres individuels et substitutions à la 89e dans la compo
- Tactique Jeu créatif affichée

## [0.6.3] - 2026-03-13

### Amélioré
- Terrain retourné : gardien en haut, attaquants en bas
- Prompt : table explicite des combos formation/entraînement optimaux

## [0.6.2] - 2026-03-13

### Amélioré
- Prompt : Triangle d'analyse (compétences + notes historiques + phrases coach/scout)
- Joueur à 1★ depuis 16 matchs → ne plus le remettre à ce poste
- Phrases du coach exploitées pour déterminer le vrai profil du joueur

## [0.6.1] - 2026-03-13

### Amélioré
- Prompt : évaluation profil complet. Buteur 7 + Passe 2 MAXÉ = bouche-trou, pas prospect.
- Prompt : formation optimisée pour l'entraînement. Buteur + Construction → 2-5-3 pas 3-4-3.
- Prompt : classement revu. STARS = max 7+ ET compétences secondaires correctes.

## [0.6.0] - 2026-03-13

### Amélioré
- Prompt système refondu : 5 niveaux de priorité pour la composition. Progression > Révélation. Plus jamais un ailier en gardien.
- Composition graphique : terrain de football avec joueurs positionnés par ligne
- Réponse structurée : entraînements en blocs colorés, pitch, justifications, résumé
- Fallback texte si JSON non parsable

## [0.5.0] - 2026-03-13

### Ajouté
- Tri sur toutes les colonnes du tableau (y compris GK, DEF, CON, AIL, PAS, BUT, CF)
- Analyses Promotions/Licenciements repliables (clic sur le titre)
- Analyses persistantes (sauvegardées en D1, survivent au rechargement)
- Bouton "Relancer l'analyse" dans chaque panneau

## [0.4.3] - 2026-03-13

### Corrigé
- Tri chronologique des rapports et de l'historique (plus récent en premier)
- Import rapport : plus de custom_ comme ID, champ de saisie manuelle disponible

### Amélioré
- Historique joueur : phrases du rapport coach sous le match concerné
- Import rapport : deux modes (sélection ou saisie manuelle ID + date)

## [0.4.2] - 2026-03-13

### Corrigé
- Dates au format européen (DD-MM-YYYY) correctement interprétées
- Toutes les dates utilisent un parser centralisé

### Ajouté
- Changelog cliquable depuis le numéro de version dans le header

## [0.4.1] - 2026-03-13

### Corrigé
- Rapports dans fiche joueur : n'affiche plus que les phrases du rapport coach mentionnant le joueur

### Ajouté
- Numéro de version affiché dans le header et dans Paramètres

## [0.4.0] - 2026-03-13

### Corrigé
- Bug critique : l'API /api/history ne recevait pas les données
- Bug : référence à showImportHistory cassait l'app
- Bug : les rapports affichaient tout au lieu de filtrer par joueur

### Amélioré
- Import en masse chunké (paquets de 200)
- Rafraîchissement auto de l'historique après import

## [0.3.0] - 2026-03-13

### Ajouté
- Score de potentiel (0-100) calculé automatiquement
- Prédictions IA des compétences inconnues (bouton Analyser)
- Import HRF historique en masse (sélection multiple)
- Historique des matchs par joueur dans le panneau de détail
- Tables D1 ai_predictions et player_match_history

## [0.2.0] - 2026-03-13

### Ajouté
- Onglet Rapports (liste, modification, suppression)
- Passage au stockage Cloudflare D1
- Renommage en ai-trick

## [0.1.0] - 2026-03-13

### Ajouté
- Import et parsing de fichiers HRF
- Tableau compact des joueurs jeunes
- Panneau de détail joueur avec barres de progression
- Import de rapports de match (3 champs)
- Composition IA avec Plan B
- Recrutement IA (analyse des 3 profils scouts)
- Promotions et Licenciements IA
- Page Paramètres (clé API + notes complémentaires)
- Prompt système complet avec règles Hattrick
- Dark mode
- Proxy Cloudflare Pages Function pour l'API Anthropic`;

export default function ChangelogModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 640, maxHeight: '85vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2>📋 Changelog</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-main)'
        }}>
          {CHANGELOG.split('\n').map((line, i) => {
            if (line.startsWith('## ')) {
              return <h3 key={i} style={{ color: 'var(--accent-green)', fontSize: '1rem', fontWeight: 700, marginTop: i > 0 ? 20 : 0, marginBottom: 8 }}>{line.replace('## ', '')}</h3>
            }
            if (line.startsWith('### ')) {
              return <h4 key={i} style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: 600, marginTop: 12, marginBottom: 4 }}>{line.replace('### ', '')}</h4>
            }
            if (line.startsWith('- ')) {
              return <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>• {line.replace('- ', '')}</div>
            }
            return <div key={i}>{line}</div>
          })}
        </div>
      </div>
    </div>
  )
}
