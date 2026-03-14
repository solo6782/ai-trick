import { buildFullPrompt } from '../data/systemPrompt.js';
import { loadApiKey, loadCustomNotes, loadPlayerHistory } from './storage.js';
import { getSkillLabel, getPositionLabel } from './hrfParser.js';

/**
 * Robust JSON extraction from AI response.
 * Handles: raw JSON, ```json blocks, text before/after JSON, truncated JSON.
 */
function extractJSON(text) {
  if (!text) return null;

  // 1. Try extracting from ```json block
  const jsonBlock = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlock) {
    try { return JSON.parse(jsonBlock[1].trim()); } catch {}
  }

  // 2. Try extracting from ``` block (without json tag)
  const codeBlock = text.match(/```\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch {}
  }

  // 3. Find the first [ or { and try to parse from there
  const arrStart = text.indexOf('[');
  const objStart = text.indexOf('{');
  const start = arrStart >= 0 && objStart >= 0 ? Math.min(arrStart, objStart)
    : arrStart >= 0 ? arrStart : objStart;

  if (start >= 0) {
    const substr = text.substring(start);
    try { return JSON.parse(substr); } catch {}

    // 4. Try to fix truncated JSON (find last valid closing bracket)
    const isArray = text[start] === '[';
    const closer = isArray ? ']' : '}';
    const lastClose = substr.lastIndexOf(closer);
    if (lastClose > 0) {
      try { return JSON.parse(substr.substring(0, lastClose + 1)); } catch {}
    }

    // 5. Brute force: try adding closing brackets
    let attempt = substr;
    for (let i = 0; i < 5; i++) {
      attempt += closer;
      try { return JSON.parse(attempt); } catch {}
    }
  }

  // 6. Last resort: try the whole thing
  try { return JSON.parse(text.trim()); } catch {}

  return null;
}

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
    `Analyse CHAQUE joueur de l'effectif. Pour chacun :
1. Estimer les compétences INCONNUES
2. Classifier le joueur
3. Identifier son poste naturel
4. Lister les compétences manquantes

CATÉGORIES :
- STAR : max 7+ dans compétence clé ET secondaires correctes (Passe ≥4 pour attaquant, Construction ≥5 pour milieu)
- PROSPECT : prometteur, marge de progression, profil complet bon
- MYSTERE : peu révélé, profil incertain, à explorer
- GOLFEUR : compétences révélées/maxées bas. INCLUT les joueurs avec principale haute mais secondaires MAXÉES bas (ex: Buteur 7 + Passe 2 MAXÉ = GOLFEUR)
- INUTILE : quasi promu maxé, blessé, aucun apport

CONTRAINTES DE FORMAT CRITIQUES :
- "justification" : 30 MOTS MAXIMUM. Que les chiffres clés. Ex: "Buteur 5/7, Passe 2/2 MAXÉ → unidimensionnel, invendable"
- "naturalPosition" : 3 mots max. Ex: "Attaquant", "Milieu", "Ailier"
- "missingSkills" : max 3 items, noms courts. Ex: ["GK", "CON max", "AIL actuel"]
- Pour les compétences déjà connues dans le HRF, mets null (pas un objet)
- Sois conservateur : mieux vaut null qu'une mauvaise prédiction
- NE PAS ajouter de texte avant ou après le JSON

Réponds UNIQUEMENT avec le JSON, format :
[{"id":"ID","category":"CAT","justification":"30 mots max","naturalPosition":"Poste","missingSkills":["X"],"keeper":null,"defender":null,"playmaker":null,"winger":null,"passing":null,"scorer":null,"setPieces":null}]

Chaque compétence = null (si connue) ou {"current":N,"max":N,"confidence":"low/medium/high"} (si inconnue et estimable).

Joueurs : ${playerIds.join(', ')}`, hrfData, matchReports);

  // Robust JSON extraction
  const parsed = extractJSON(response);
  if (!parsed) {
    console.error('Failed to parse AI predictions. Raw response:', response.substring(0, 500));
    throw new Error('L\'IA n\'a pas retourné un JSON valide. Réponse tronquée ou format inattendu. Réessaie.');
  }
  return parsed;
}

// ── STEP 2: Composition (compact call - NO raw HRF data) ──

function buildCompactPlayerList(hrfData, predictions) {
  const lines = [];
  for (const p of hrfData.youthPlayers) {
    const pred = predictions?.[p.id] || {};
    const skills = [];
    for (const [name, key] of [['GK','keeper'],['DEF','defender'],['CON','playmaker'],['AIL','winger'],['PAS','passing'],['BUT','scorer'],['CF','setPieces']]) {
      const s = p.skills[key];
      const cur = s.current !== null ? s.current : '?';
      const max = s.max !== null ? s.max : '?';
      const maxed = s.maxReached ? ' MAXÉ' : '';
      skills.push(`${name}:${cur}/${max}${maxed}`);
    }
    const cat = pred.category || '?';
    const pos = pred.naturalPosition || '?';
    const promo = p.isPromotable ? 'PRÊT' : `${p.daysUntilPromotion}j`;
    lines.push(`- ${p.name} (ID:${p.id}) | ${p.age}a ${p.ageDays}j | Spé:${p.specialtyLabel || '-'} | Promo:${promo} | CAT:${cat} | Poste:${pos} | ${skills.join(', ')} | ${pred.justification || ''}`);
  }
  return lines.join('\n');
}

async function callAICompo(message) {
  const apiKey = await loadApiKey();
  if (!apiKey) throw new Error('Clé API Anthropic non configurée.');

  const customNotes = await loadCustomNotes();
  const systemPrompt = buildFullPrompt(customNotes);

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, system: systemPrompt, message })
  });

  if (!res.ok) { const e = await res.text(); throw new Error(`Erreur API: ${res.status} — ${e}`); }
  const data = await res.json();
  return data.content?.[0]?.text || 'Pas de réponse.';
}

export async function askComposition(hrfData, matchReports, predictions) {
  const playerList = buildCompactPlayerList(hrfData, predictions);
  const training = hrfData?.training?.type || 'inconnu';

  return callAICompo(`## EFFECTIF (${hrfData.youthPlayers.length} joueurs) — Entraînement senior: ${training}

${playerList}

## DEMANDE
Compose le 11 pour le prochain match junior. Les catégories (CAT) sont DÉJÀ CALCULÉES. Ne les recalcule PAS.

ÉTAPES :
1. Choisis entraînement PRIMAIRE + SECONDAIRE (JAMAIS le même). Justifie en 1 phrase.
2. Choisis la FORMATION optimale pour ce combo (cf. règles du prompt).
3. Place les joueurs : STARS/PROSPECTS → postes entraînables. MYSTÈRES → alignés obligatoirement (postes test ou entraînables). GOLFEURS → postes morts. INUTILES → banc.
4. Ordres individuels (Défensif/Normal/Offensif/Vers le centre) selon les règles.
5. Substitutions 89e si un mystère peut tester un nouveau poste.

Réponds UNIQUEMENT avec le JSON ci-dessous, RIEN d'autre :
{"primaryTraining":"X","secondaryTraining":"Y","trainingJustification":"1 phrase","tactic":"Jeu créatif","formation":"X-X-X","lineup":[{"position":"Poste","playerId":"ID","playerName":"Nom","order":"Normal","reason":"10 mots max"}],"subs":[{"playerName":"Nom","reason":"10 mots max"}],"substitutions":[{"minute":89,"out":"Nom","in":"Nom","position":"Poste","reason":"10 mots max"}],"trainingChange":null,"summary":"2 phrases max"}`);
}

export async function askCompositionPlanB(hrfData, matchReports, feedback = '', predictions = null) {
  const playerList = buildCompactPlayerList(hrfData, predictions);
  const extra = feedback ? `\nRaison du refus : ${feedback}` : '';

  return callAICompo(`## EFFECTIF (${hrfData.youthPlayers.length} joueurs)

${playerList}

Plan A refusé.${extra}
Propose un PLAN B avec approche DIFFÉRENTE. Respecte les catégories (CAT) sans les recalculer.

Réponds UNIQUEMENT avec le JSON :
{"primaryTraining":"X","secondaryTraining":"Y","trainingJustification":"1 phrase","tactic":"Jeu créatif","formation":"X-X-X","lineup":[{"position":"Poste","playerId":"ID","playerName":"Nom","order":"Normal","reason":"10 mots max"}],"subs":[{"playerName":"Nom","reason":"10 mots max"}],"substitutions":[],"trainingChange":null,"summary":"2 phrases max"}`);
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
