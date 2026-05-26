import { buildFullPrompt } from '../data/systemPrompt.js';
import { loadCustomNotes, loadPlayerHistory } from './storage.js';
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

const MODEL_OPUS = 'claude-opus-4-6';
const MODEL_SONNET = 'claude-sonnet-4-6';

// Logs Anthropic token usage so the cache effect is verifiable in the browser console (F12).
function logUsage(label, data) {
  const u = data?.usage;
  if (!u) return;
  const created = u.cache_creation_input_tokens || 0;
  const read = u.cache_read_input_tokens || 0;
  const fresh = u.input_tokens || 0;
  console.log(
    `[ai-trick cache] ${label} — entrée: ${fresh} | mis en cache: ${created} | relu du cache (~10%): ${read} | sortie: ${u.output_tokens || 0}`
  );
}

async function callAI(userMessage, hrfData, model = MODEL_OPUS, opts = {}) {
  const { includeTeam = true, label = 'callAI' } = opts;

  const customNotes = await loadCustomNotes();
  const systemPrompt = buildFullPrompt(customNotes);

  // System prompt is identical across every call → mark it cacheable.
  const systemBlocks = [
    { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
  ];

  // The team roster block is identical across predictions/promotions/dismissals
  // within a cycle → mark it cacheable as its own user content block.
  const messageBlocks = [];
  if (hrfData && includeTeam) {
    const history = await loadPlayerHistory();
    let context = `## DONNÉES DE L'ÉQUIPE\n`;
    context += `Équipe: ${hrfData.team.youthTeamName} (${hrfData.team.teamName})\n`;
    context += `Saison: ${hrfData.team.season}, Journée: ${hrfData.team.matchRound}\n`;
    context += `Entraînement senior: ${hrfData.training.type} (intensité: ${hrfData.training.level}%, endurance: ${hrfData.training.staminaPart}%)\n\n`;
    context += `## EFFECTIF JUNIOR (${hrfData.youthPlayers.length} joueurs)\n\n`;
    context += hrfData.youthPlayers.map(p => formatPlayerForAI(p, history)).join('\n---\n');
    messageBlocks.push({ type: 'text', text: context, cache_control: { type: 'ephemeral' } });
  }
  // The question varies per call → not cached.
  messageBlocks.push({ type: 'text', text: userMessage });

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, systemBlocks, messageBlocks })
  });

  if (!res.ok) { const e = await res.text(); throw new Error(`Erreur API: ${res.status} — ${e}`); }
  const data = await res.json();
  logUsage(label, data);
  return data.content?.[0]?.text || 'Pas de réponse.';
}

// ── STEP 1: Analyze (predict skills + classify players) ──

export async function askPredictions(hrfData) {
  const playerIds = hrfData.youthPlayers.map(p => `${p.id} (${p.name})`);
  const response = await callAI(
    `Analyse CHAQUE joueur. Pour chacun, suis cet ALGORITHME dans cet ORDRE EXACT :

ÉTAPE 1 — FILTRE TEMPS (obligatoire, faire en PREMIER) :
- Compétence principale = celle avec le max le plus élevé
- Niveaux restants = max - actuel (si actuel inconnu, estimer)
- SI âge ≥ 17 ans ET niveaux restants ≥ 2 → catégorie = GOLFEUR (justification : "trop tard, Xa Xj, [compétence] X/Y = Z ups restants"). STOP, passer au joueur suivant.
- SI âge ≥ 17 ans ET secondaires du poste MAXÉES bas (≤3) → catégorie = GOLFEUR. STOP.

ÉTAPE 2 — FILTRE SECONDAIRES (si pas filtré à l'étape 1) :
- Vérifier les compétences secondaires du poste naturel
- Attaquant : Passe ET Ailier doivent être ≥ 4 max (non maxées bas)
- Milieu : Passe ET Défense doivent être ≥ 4 max
- Ailier : Construction ET Passe doivent être ≥ 4 max
- SI secondaires MAXÉES ≤ 3 → catégorie = GOLFEUR. STOP.

ÉTAPE 3 — CLASSIFICATION FINALE (si pas filtré avant) :
- Peu de compétences révélées + ≤ 16 ans → MYSTERE
- Max 7+ ET secondaires OK ET ≤ 16 ans (ou 17 ans + 1 seul up restant) → STAR
- Bon potentiel mais temps serré ou incertain → PROSPECT
- Sinon → GOLFEUR ou INUTILE

CONTRAINTES DE FORMAT :
- "justification" : 30 MOTS MAX. TOUJOURS commencer par "Xa Xj," puis le calcul de temps. Ex: "17a 8j, CON 4/7=3 ups, trop tard→golfeur" ou "15a 99j, PAS 5/8=3 ups, temps OK→STAR"
- "naturalPosition" : 3 mots max
- "missingSkills" : max 3 items courts
- Compétences déjà connues dans le HRF = null
- NE PAS ajouter de texte avant ou après le JSON

Réponds UNIQUEMENT avec le JSON :
[{"id":"ID","category":"CAT","justification":"30 mots max","naturalPosition":"Poste","missingSkills":["X"],"keeper":null,"defender":null,"playmaker":null,"winger":null,"passing":null,"scorer":null,"setPieces":null}]

Chaque compétence = null (si connue) ou {"current":N,"max":N,"confidence":"low/medium/high"} (si inconnue et estimable).

Joueurs : ${playerIds.join(', ')}`, hrfData, MODEL_SONNET, { label: 'predictions' });

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

async function callAICompo(message, model = MODEL_OPUS, label = 'compo') {
  const customNotes = await loadCustomNotes();
  const systemPrompt = buildFullPrompt(customNotes);

  const systemBlocks = [
    { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
  ];

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, systemBlocks, messageBlocks: [{ type: 'text', text: message }] })
  });

  if (!res.ok) { const e = await res.text(); throw new Error(`Erreur API: ${res.status} — ${e}`); }
  const data = await res.json();
  logUsage(label, data);
  return data.content?.[0]?.text || 'Pas de réponse.';
}

export async function askComposition(hrfData, predictions) {
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

export async function askCompositionPlanB(hrfData, feedback = '', predictions = null) {
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

Compare entre eux. Meilleur potentiel brut, indépendamment des besoins.`, hrfData, MODEL_SONNET, { includeTeam: false, label: 'recruitment' });
}

export async function askPromotions(hrfData) {
  return callAI(`Analyse chaque joueur promouvable. Pour chacun :
- "PROMOUVOIR MAINTENANT" (vendre / intégrer / va expirer)
- "ATTENDRE" (progression en cours, ups restants)
- "NE PAS PROMOUVOIR" (sans valeur)
Entraînement senior : ${hrfData?.training?.type || 'inconnu'}.`, hrfData, MODEL_SONNET, { label: 'promotions' });
}

export async function askDismissals(hrfData) {
  return callAI(`Effectif : ${hrfData?.youthPlayers?.length || '?'} joueurs (seuil : 14 max).
Identifie les candidats au licenciement, du moins utile au plus utile. Justifie.
JAMAIS licencier un joueur au potentiel largement inconnu.`, hrfData, MODEL_SONNET, { label: 'dismissals' });
}
