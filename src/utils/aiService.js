import { buildFullPrompt } from '../data/systemPrompt.js';
import { loadApiKey, loadCustomNotes, loadPlayerHistory } from './storage.js';
import { getSkillLabel, getPositionLabel } from './hrfParser.js';

function formatPlayerForAI(player, history) {
  const skills = Object.entries({
    'Gardien': player.skills.keeper, 'Défense': player.skills.defender,
    'Construction': player.skills.playmaker, 'Ailier': player.skills.winger,
    'Passe': player.skills.passing, 'Buteur': player.skills.scorer,
    'Coup franc': player.skills.setPieces
  }).map(([name, s]) => {
    const cur = s.current !== null ? `${s.current} (${getSkillLabel(s.current)})` : '?';
    const max = s.max !== null ? `${s.max} (${getSkillLabel(s.max)})` : '?';
    return `  ${name}: actuel=${cur}, max=${max}${s.maxReached ? ' [MAXÉ]' : ''}`;
  }).join('\n');

  const lm = player.lastMatch.date
    ? `Dernier match: ${player.lastMatch.date}, poste=${getPositionLabel(player.lastMatch.positionCode)}, ${player.lastMatch.playedMinutes}min, note=${player.lastMatch.rating}★`
    : 'Aucun match récent';

  const playerHistory = (history || []).filter(h => h.player_id === player.id);
  let histStr = '';
  if (playerHistory.length > 0) {
    histStr = 'Historique matchs:\n' + playerHistory.map(h =>
      `  ${h.match_date} | ${getPositionLabel(h.position_code)} | ${h.played_minutes}min | ${h.rating}★`
    ).join('\n') + '\n';
  }

  const scouts = player.scoutComments.map(c => `  - ${c.text}`).join('\n');

  return `### ${player.name} (ID: ${player.id})
Âge: ${player.age}a ${player.ageDays}j | Spécialité: ${player.specialtyLabel || 'Aucune'} | Promotion: ${player.isPromotable ? 'PRÊT' : `dans ${player.daysUntilPromotion}j`}
Blessé: ${player.isInjured ? 'OUI' : 'Non'} | Cartons: ${player.cards} | Buts: ${player.careerGoals}
Compétences:\n${skills}\n${lm}\n${histStr}Scout:\n${scouts || '  Aucun'}\n`;
}

function formatReports(reports) {
  if (!reports || Object.keys(reports).length === 0) return '';
  return '\n## RAPPORTS DE MATCH\n' + Object.entries(reports).map(([id, r]) => {
    let t = `\n### Match ${id} (${r.date || '?'})\n`;
    if (r.rapport) t += `**Rapport:**\n${r.rapport}\n`;
    if (r.compteRendu) t += `**Compte-rendu:**\n${r.compteRendu}\n`;
    if (r.notesDetaillees) t += `**Notes détaillées:**\n${r.notesDetaillees}\n`;
    return t;
  }).join('\n');
}

async function callAI(userMessage, hrfData, matchReports = {}) {
  const apiKey = await loadApiKey();
  if (!apiKey) throw new Error('Clé API Anthropic non configurée. Va dans les Paramètres.');

  const customNotes = await loadCustomNotes();
  const systemPrompt = buildFullPrompt(customNotes);

  let context = '';
  if (hrfData) {
    const history = await loadPlayerHistory();
    context += `## DONNÉES DE L'ÉQUIPE\n`;
    context += `Équipe: ${hrfData.team.youthTeamName} (${hrfData.team.teamName})\n`;
    context += `Saison: ${hrfData.team.season}, Journée: ${hrfData.team.matchRound}\n`;
    context += `Entraînement senior: ${hrfData.training.type} (intensité: ${hrfData.training.level}%, endurance: ${hrfData.training.staminaPart}%)\n\n`;
    context += `## EFFECTIF JUNIOR (${hrfData.youthPlayers.length} joueurs)\n\n`;
    context += hrfData.youthPlayers.map(p => formatPlayerForAI(p, history)).join('\n---\n');
    context += formatReports(matchReports);
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, system: systemPrompt, message: context ? `${context}\n\n---\n\n${userMessage}` : userMessage })
  });

  if (!res.ok) { const e = await res.text(); throw new Error(`Erreur API: ${res.status} — ${e}`); }
  const data = await res.json();
  return data.content?.[0]?.text || 'Pas de réponse.';
}

// ── STEP 1: Analyze (predict skills + classify players) ──

export async function askPredictions(hrfData, matchReports) {
  const playerIds = hrfData.youthPlayers.map(p => `${p.id} (${p.name})`);
  const response = await callAI(
    `Analyse CHAQUE joueur de l'effectif. Pour chacun, tu dois :
1. Estimer les compétences INCONNUES (current et/ou max) à partir des notes, commentaires, postes occupés
2. Classifier le joueur dans une catégorie
3. Identifier son poste naturel
4. Lister les compétences qui manquent pour affiner la classification

CATÉGORIES :
- STAR : max 7+ dans une compétence clé ET compétences secondaires correctes pour ce poste (Passe ≥4 pour attaquant, Construction ≥5 pour milieu, etc.)
- PROSPECT : joueur prometteur avec marge de progression, profil complet encore bon
- MYSTERE : peu de compétences révélées, profil incertain, à explorer
- GOLFEUR : beaucoup de compétences révélées/maxées bas, potentiel faible. Utile pour forcer les révélations des autres. INCLUT les joueurs avec une compétence principale haute mais secondaires MAXÉES bas (ex: Buteur 7 + Passe 2 MAXÉ = GOLFEUR)
- INUTILE : quasi promu et maxé, blessé longue durée, aucun apport

RAPPEL CRUCIAL : Un joueur avec Buteur max 7 mais Passe max 2 MAXÉ et Ailier max 3 MAXÉ est un GOLFEUR, PAS un prospect/star. Les compétences secondaires du poste comptent autant que la principale.

Réponds UNIQUEMENT avec un bloc JSON valide, sans texte avant ni après.
Format exact :
[
  {
    "id": "PLAYER_ID",
    "category": "STAR/PROSPECT/MYSTERE/GOLFEUR/INUTILE",
    "justification": "Explication concise avec données chiffrées",
    "naturalPosition": "Poste naturel détecté",
    "missingSkills": ["Liste des compétences à découvrir en priorité"],
    "keeper": {"current": null, "max": null, "confidence": "low/medium/high"},
    "defender": {"current": null, "max": null, "confidence": "low"},
    "playmaker": {"current": null, "max": null, "confidence": "low"},
    "winger": {"current": null, "max": null, "confidence": "low"},
    "passing": {"current": null, "max": null, "confidence": "low"},
    "scorer": {"current": null, "max": null, "confidence": "low"},
    "setPieces": {"current": null, "max": null, "confidence": "low"}
  }
]

Règles pour les prédictions de compétences :
- Ne remplis "current" et "max" QUE pour les compétences INCONNUES dans les données HRF
- Pour les compétences déjà connues, mets null
- Sois conservateur : mieux vaut null qu'une mauvaise prédiction

Joueurs : ${playerIds.join(', ')}`, hrfData, matchReports);

  try {
    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI predictions:', e, response);
    throw new Error('L\'IA n\'a pas retourné un format JSON valide. Réessaie.');
  }
}

// ── STEP 2: Composition (uses pre-computed classifications) ──

export async function askComposition(hrfData, matchReports, predictions) {
  // Build classification summary from stored predictions
  let classifSummary = '';
  if (predictions && Object.keys(predictions).length > 0) {
    classifSummary = '\n## CLASSIFICATION PRÉ-CALCULÉE (issue de l\'analyse)\n';
    for (const player of hrfData.youthPlayers) {
      const pred = predictions[player.id];
      if (pred?.category) {
        classifSummary += `- **${player.name}** : ${pred.category} — ${pred.justification || ''} | Poste: ${pred.naturalPosition || '?'} | Manque: ${(pred.missingSkills || []).join(', ') || 'RAS'}\n`;
      }
    }
    classifSummary += '\nCette classification est DÉFINITIVE. Utilise-la directement pour le placement.\n';
  }

  return callAI(`${classifSummary}

Propose la composition pour le prochain match junior.

UTILISE la classification ci-dessus pour placer les joueurs :
1. STARS et PROSPECTS → postes entraînables (primaire ou secondaire)
2. MYSTÈRES → TOUJOURS alignés, postes de test ou entraînables restants. JAMAIS sur le banc.
3. GOLFEURS → postes morts (gardien, défenseurs si pas entraînement Défense). Ils FORCENT les révélations.
4. INUTILES → banc

Choisis l'entraînement primaire + secondaire (JAMAIS le même type), la formation, les ordres individuels, et les substitutions à la 89e.

Réponds UNIQUEMENT avec le JSON demandé dans les instructions système.`, hrfData, matchReports);
}

export async function askCompositionPlanB(hrfData, matchReports, feedback = '', predictions = null) {
  let classifSummary = '';
  if (predictions && Object.keys(predictions).length > 0) {
    classifSummary = '\n## CLASSIFICATION PRÉ-CALCULÉE\n';
    for (const player of hrfData.youthPlayers) {
      const pred = predictions[player.id];
      if (pred?.category) {
        classifSummary += `- ${player.name}: ${pred.category}\n`;
      }
    }
  }

  const extra = feedback ? `\nRaison du refus : ${feedback}` : '';
  return callAI(`${classifSummary}\nPlan A refusé.${extra}\nPropose un PLAN B avec approche DIFFÉRENTE. Respecte les catégories de joueurs.`, hrfData, matchReports);
}

export async function askRecruitment(hrfData, profiles) {
  return callAI(`3 profils proposés par les recruteurs. Dis-moi lequel choisir et pourquoi.

PROFIL 1:\n${profiles[0] || '(vide)'}\n\nPROFIL 2:\n${profiles[1] || '(vide)'}\n\nPROFIL 3:\n${profiles[2] || '(vide)'}

Compare entre eux. Meilleur potentiel brut, indépendamment des besoins.`, hrfData);
}

export async function askPromotions(hrfData, matchReports) {
  return callAI(`Analyse chaque joueur promouvable. Pour chacun :
- "PROMOUVOIR MAINTENANT" (vendre / intégrer / va expirer)
- "ATTENDRE" (progression en cours, ups restants)
- "NE PAS PROMOUVOIR" (sans valeur)
Entraînement senior : ${hrfData?.training?.type || 'inconnu'}.`, hrfData, matchReports);
}

export async function askDismissals(hrfData, matchReports) {
  return callAI(`Effectif : ${hrfData?.youthPlayers?.length || '?'} joueurs (seuil : 14 max).
Identifie les candidats au licenciement, du moins utile au plus utile. Justifie.
JAMAIS licencier un joueur au potentiel largement inconnu.`, hrfData, matchReports);
}
