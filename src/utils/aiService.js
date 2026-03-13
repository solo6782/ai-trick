import { buildFullPrompt } from '../data/systemPrompt.js';
import { loadApiKey, loadCustomNotes } from './storage.js';
import { getSkillLabel, getPositionLabel } from './hrfParser.js';

function formatPlayerForAI(player) {
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

  const scouts = player.scoutComments.map(c => `  - ${c.text}`).join('\n');

  return `### ${player.name}
Âge: ${player.age}a ${player.ageDays}j | Spécialité: ${player.specialtyLabel || 'Aucune'} | Promotion: ${player.isPromotable ? 'PRÊT' : `dans ${player.daysUntilPromotion}j`}
Blessé: ${player.isInjured ? 'OUI' : 'Non'} | Cartons: ${player.cards} | Buts: ${player.careerGoals}
Compétences:\n${skills}\n${lm}\nScout:\n${scouts || '  Aucun'}\n`;
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

export async function callAI(userMessage, hrfData, matchReports = {}) {
  const apiKey = await loadApiKey();
  if (!apiKey) throw new Error('Clé API Anthropic non configurée. Va dans les Paramètres.');

  const customNotes = await loadCustomNotes();
  const systemPrompt = buildFullPrompt(customNotes);

  let context = '';
  if (hrfData) {
    context += `## DONNÉES DE L'ÉQUIPE\n`;
    context += `Équipe: ${hrfData.team.youthTeamName} (${hrfData.team.teamName})\n`;
    context += `Saison: ${hrfData.team.season}, Journée: ${hrfData.team.matchRound}\n`;
    context += `Entraînement senior: ${hrfData.training.type} (intensité: ${hrfData.training.level}%, endurance: ${hrfData.training.staminaPart}%)\n\n`;
    context += `## EFFECTIF JUNIOR (${hrfData.youthPlayers.length} joueurs)\n\n`;
    context += hrfData.youthPlayers.map(formatPlayerForAI).join('\n---\n');
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

export async function askComposition(hrfData, matchReports) {
  return callAI(`Propose la composition pour le prochain match junior.
Indique : 1. Entraînement PRIMAIRE et SECONDAIRE recommandés (justification)
2. Composition complète (11 + remplaçants) avec poste de chaque joueur
3. Pour chaque joueur : pourquoi ce poste (révélation, progression, bouche-trou)
4. Changement d'entraînement si nécessaire
5. Joueurs qui ne jouent pas et pourquoi
Rappel : le but n'est PAS de gagner.`, hrfData, matchReports);
}

export async function askCompositionPlanB(hrfData, matchReports, feedback = '') {
  const extra = feedback ? `\nRaison du refus : ${feedback}` : '';
  return callAI(`Plan A refusé.${extra}\nPropose un PLAN B avec approche DIFFÉRENTE.`, hrfData, matchReports);
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

export async function askPredictions(hrfData, matchReports) {
  const playerIds = hrfData.youthPlayers.map(p => p.id);
  const response = await callAI(
    `Analyse chaque joueur et estime les compétences INCONNUES.

Pour chaque joueur, déduis les niveaux probables à partir de :
- Les notes en étoiles des matchs (un joueur à 5★ en milieu a probablement une bonne Construction)
- Les commentaires du scout (types de commentaires = fourchettes de niveau)
- Les notes de secteur des comptes-rendus
- Les événements de match (occasions créées, buts, etc.)
- Le poste occupé et la note obtenue
- Les compétences déjà connues (cohérence du profil)

Réponds UNIQUEMENT avec un bloc JSON valide, sans texte avant ni après.
Format exact :
[
  {
    "id": "PLAYER_ID",
    "keeper": {"current": null ou 0-18, "max": null ou 0-18, "confidence": "low/medium/high"},
    "defender": {"current": null, "max": null, "confidence": "low"},
    "playmaker": {"current": null, "max": null, "confidence": "low"},
    "winger": {"current": null, "max": null, "confidence": "low"},
    "passing": {"current": null, "max": null, "confidence": "low"},
    "scorer": {"current": null, "max": null, "confidence": "low"},
    "setPieces": {"current": null, "max": null, "confidence": "low"}
  }
]

Règles :
- Ne remplis "current" et "max" QUE pour les compétences qui sont INCONNUES dans les données HRF
- Pour les compétences déjà connues, mets null (on garde la valeur HRF)
- "confidence" indique ton niveau de certitude : "high" si forte évidence, "medium" si probable, "low" si spéculatif
- Si tu n'as aucune base pour estimer, mets null
- Sois conservateur : mieux vaut null qu'une mauvaise prédiction

IDs des joueurs : ${playerIds.join(', ')}`, hrfData, matchReports);

  // Parse JSON from AI response
  try {
    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI predictions:', e, response);
    throw new Error('L\'IA n\'a pas retourné un format JSON valide. Réessaie.');
  }
}
